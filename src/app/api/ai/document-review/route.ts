import { NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getChecklistForStream } from "@/lib/document-checklists";

export async function POST(request: Request) {
  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const mode = String(formData.get("mode") || "");
  const stream = String(formData.get("stream") || "");
  const stage = String(formData.get("stage") || "single");
  const document_key = String(formData.get("document_key") || "");
  const checklist_status_raw = String(formData.get("checklist_status") || "{}");
  let checklist_status: Record<string, { has: boolean; notes?: string }> = {};
  try {
    checklist_status = JSON.parse(checklist_status_raw);
  } catch {
    checklist_status = {};
  }
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  // mode: "single" | "bulk"
  // stream: the checklist stream key
  // stage: "provincial" | "federal" | "single"
  // checklist_status: { [key: string]: { has: boolean; notes?: string } }
  // document_key: (single mode) which doc to review
  // document_details: (single mode) user-provided description of their document

  const streamChecklist = getChecklistForStream(stream);
  if (!streamChecklist) {
    return NextResponse.json({ error: "Unknown stream" }, { status: 400 });
  }

  if (mode !== "single" && mode !== "bulk") {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "Upload required. Please upload document files for review." }, { status: 400 });
  }

  // Fetch user profile for context
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, immigration_status, current_province, target_pr_stream, has_applied_pr")
    .eq("id", user.id)
    .single();

  const checklistSummary = streamChecklist.items.map(item => {
    const status = checklist_status?.[item.key];
    return `- ${item.label}: ${status?.has ? "HAS IT" : "MISSING"}${status?.notes ? ` (note: ${status.notes})` : ""} ${item.required ? "[REQUIRED]" : "[OPTIONAL]"}`;
  }).join("\n");
  const uploadedFilesSummary = files.map((file) => `- ${file.name} (${file.type || "unknown"}, ${file.size} bytes)`).join("\n");

  if (mode === "single") {
    const item = streamChecklist.items.find(i => i.key === document_key);
    if (!item) {
      return NextResponse.json({ error: "Unknown document" }, { status: 400 });
    }

    const prompt = `You are a blunt, expert Canadian immigration document reviewer. 

STREAM: ${streamChecklist.label}
STAGE: ${stage}
DOCUMENT: ${item.label}
DOCUMENT REQUIREMENT: ${item.description}
REQUIRED: ${item.required ? "Yes" : "No"}
UPLOADED FILES FOR THIS DOCUMENT:
${uploadedFilesSummary}

USER PROFILE:
- Status: ${profile?.immigration_status || "Unknown"}
- Province: ${profile?.current_province || "Unknown"}
- Applied for PR: ${profile?.has_applied_pr ? "Yes" : "No"}

RULES:
- Give a ONE WORD verdict first: STRONG, GOOD, WEAK, BAD, or MISSING.
- Then 1-2 sentences explaining why.
- Then 1 sentence with the exact fix if needed.
- Be direct. No filler. No "I recommend" or "You might want to consider."
- If good, say it's good and why.
- If bad, say exactly what's wrong.

Return ONLY valid JSON:
{
  "verdict": "STRONG|GOOD|WEAK|BAD|MISSING",
  "reason": "Why this verdict",
  "fix": "What to do (null if STRONG/GOOD)",
  "priority": "critical|important|minor|none"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      return NextResponse.json(content ? JSON.parse(content) : { error: "No response" });
    } catch {
      return NextResponse.json({ error: "AI review failed" }, { status: 500 });
    }
  }

  const requiredCount = streamChecklist.items.filter(i => i.required).length;
  if (files.length < requiredCount) {
    return NextResponse.json({
      error: `Full package review requires all document uploads. You uploaded ${files.length}, but this stream has ${requiredCount} required documents.`,
    }, { status: 400 });
  }

  // BULK mode
  const prompt = `You are a blunt, expert Canadian immigration document reviewer doing a FULL APPLICATION PACKAGE REVIEW.

STREAM: ${streamChecklist.label}
STAGE: ${stage}
TOTAL REQUIRED DOCUMENTS: ${streamChecklist.items.filter(i => i.required).length}

CHECKLIST STATUS:
${checklistSummary}

UPLOADED FILES:
${uploadedFilesSummary}

USER PROFILE:
- Status: ${profile?.immigration_status || "Unknown"}
- Province: ${profile?.current_province || "Unknown"}
- Applied for PR: ${profile?.has_applied_pr ? "Yes" : "No"}

RULES:
- Be brutally honest. This person's PR application depends on getting this right.
- For each document, give a verdict: STRONG, GOOD, WEAK, BAD, or MISSING.
- Keep each document review to 1-2 lines maximum.
- For the overall review, be direct about readiness.
- Identify the top 3 critical issues that would cause delays or refusals.
- End with one clear next action.
- No filler, no apologies, no "I recommend" padding.

Return ONLY valid JSON:
{
  "overallVerdict": "READY|ALMOST|NOT_READY|CRITICAL_GAPS",
  "overallSummary": "1-2 sentences on application readiness",
  "readinessPercent": 0-100,
  "documents": [
    {
      "key": "document_key",
      "label": "Document Name",
      "verdict": "STRONG|GOOD|WEAK|BAD|MISSING",
      "note": "Short reason",
      "fix": "Fix if needed, null otherwise"
    }
  ],
  "criticalIssues": [
    "Issue 1",
    "Issue 2",
    "Issue 3"
  ],
  "nextAction": "One clear next step"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    return NextResponse.json(content ? JSON.parse(content) : { error: "No response" });
  } catch {
    return NextResponse.json({ error: "AI review failed" }, { status: 500 });
  }
}
