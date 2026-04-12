import { NextRequest, NextResponse } from "next/server";
import { getOpenAI, SYSTEM_PROMPT } from "@/lib/openai";
import type { UserCase, ChatMessage } from "@/lib/types";

function buildContext(userCase: UserCase): string {
  const parts: string[] = ["=== USER IMMIGRATION PROFILE ==="];

  if (userCase.profile) {
    parts.push(`
Status: ${userCase.profile.immigration_status}
Name: ${userCase.profile.full_name}
Province: ${userCase.profile.current_province || "Not set"}
PGWP Stream: ${userCase.profile.pgwp_stream || "N/A"}`);
  }

  if (userCase.permits.length) {
    parts.push("\n--- PERMITS ---");
    for (const p of userCase.permits) {
      parts.push(`- ${p.permit_type}: expires ${p.expiry_date}, status: ${p.status}${p.is_maintained_status ? " (MAINTAINED STATUS)" : ""}${p.extension_applied ? " (extension applied)" : ""}`);
    }
  }

  if (userCase.passports.length) {
    parts.push("\n--- PASSPORT ---");
    for (const p of userCase.passports) {
      parts.push(`- ${p.country_of_issue}: expires ${p.expiry_date}`);
    }
  }

  if (userCase.languageTests.length) {
    parts.push("\n--- LANGUAGE TESTS ---");
    for (const t of userCase.languageTests) {
      parts.push(`- ${t.test_type}: L${t.listening_score}/R${t.reading_score}/W${t.writing_score}/S${t.speaking_score} (CLB: L${t.clb_listening}/R${t.clb_reading}/W${t.clb_writing}/S${t.clb_speaking}), expires ${t.expiry_date}`);
    }
  }

  if (userCase.workHistory.length) {
    parts.push("\n--- WORK HISTORY ---");
    for (const w of userCase.workHistory) {
      parts.push(`- ${w.job_title} at ${w.employer_name} (${w.start_date} to ${w.is_current ? "present" : w.end_date}), NOC: ${w.noc_code || "unknown"}, TEER: ${w.teer_category || "unknown"}, Canadian: ${w.is_canadian_experience}, ${w.hours_per_week}h/week`);
    }
  }

  if (userCase.educationHistory.length) {
    parts.push("\n--- EDUCATION ---");
    for (const e of userCase.educationHistory) {
      parts.push(`- ${e.credential_type}: ${e.program_name} at ${e.institution_name}, Canadian: ${e.is_canadian}, ECA: ${e.eca_completed}`);
    }
  }

  if (userCase.documents.length) {
    parts.push(`\n--- DOCUMENTS: ${userCase.documents.length} uploaded ---`);
    const types = [...new Set(userCase.documents.map(d => d.document_type))];
    parts.push(`Types: ${types.join(", ")}`);
  }

  return parts.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const { message, history, userCase } = await request.json();

    const openai = getOpenAI();
    if (!openai) {
      return NextResponse.json({
        response: "AI Advisor is not configured yet. Please add your OPENAI_API_KEY to the environment variables.\n\nIn the meantime, here are some general tips:\n\n• Keep all your documents up to date\n• Apply for extensions well before expiry (at least 90 days)\n• Track your Canadian work experience carefully\n• Take your language test early\n• Consider consulting an RCIC for complex situations",
      });
    }

    const context = buildContext(userCase);

    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      { role: "system" as const, content: `Current date: ${new Date().toISOString().split("T")[0]}\n\n${context}` },
      ...((history || []) as ChatMessage[]).map((m: ChatMessage) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.3,
      max_tokens: 1500,
    });

    return NextResponse.json({
      response: completion.choices[0].message.content,
    });
  } catch (error: any) {
    console.error("AI Advisor error:", error);
    return NextResponse.json(
      { response: "I'm having trouble processing your request. Please try again in a moment." },
      { status: 500 }
    );
  }
}
