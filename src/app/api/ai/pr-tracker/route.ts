import { NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const body = await request.json();
  const { program, noc_code, province, crs_score, has_applied, pnp_stream } = body;

  const supabase = await createServerSupabaseClient();

  // Fetch actual stored updates from the database
  const { data: updates } = await supabase
    .from("immigration_updates")
    .select("title, summary, plain_language, source_url, source_name, category, urgency, published_at, detected_at, is_official, confidence_score, affected_groups, metadata")
    .order("detected_at", { ascending: false })
    .limit(30);

  const hasUpdates = updates && updates.length > 0;

  // Build context from fetched data only
  const fetchedContext = hasUpdates
    ? updates.map(u => `[${u.source_name}] ${u.title}: ${u.summary} (source: ${u.source_url})`).join("\n")
    : "No verified updates have been ingested yet. The data pipeline has not run or no changes were detected.";

  const prompt = `You are a Canadian immigration data analyst. Today is ${new Date().toISOString().split("T")[0]}.

STRICT RULES:
1. You may ONLY summarize information from the FETCHED DATA below. Do NOT invent any draw results, processing times, CRS cutoffs, fee amounts, or dates.
2. If information is not available in the fetched data, say "No verified data available" — do NOT guess.
3. Every claim must be traceable to a source in the fetched data.
4. If two sources conflict, surface the conflict — do NOT blend them.
5. Never present old data as current without noting the date.

USER CONTEXT:
- Program: ${program || "Not specified"}
- PNP Stream: ${pnp_stream || "Not specified"}
- Province: ${province || "Not specified"}
- NOC: ${noc_code || "Not specified"}
- CRS: ${crs_score || "Not specified"}
- Applied: ${has_applied ? "Yes" : "No"}

FETCHED DATA (${updates?.length || 0} updates from official sources):
${fetchedContext}

Return ONLY valid JSON:
{
  "yourStream": {
    "name": "The user's program name",
    "currentStatus": "Summary based ONLY on fetched data. If no data, say 'No verified updates available for this program.'",
    "dataAvailable": true/false,
    "sources": ["list of source URLs used for this section"]
  },
  "relevantUpdates": [
    {
      "title": "update title from fetched data",
      "summary": "summary from fetched data",
      "source_url": "the original source URL",
      "source_name": "source name",
      "is_official": true/false,
      "whyRelevant": "Why this matters to this specific user",
      "urgency": "critical/high/normal/low"
    }
  ],
  "processingTimes": {
    "available": true/false,
    "note": "If available, summarize from source data. If not: 'Processing time data not yet ingested. Check IRCC directly: https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html'",
    "source_url": "URL if data available, null otherwise"
  },
  "advice": {
    "text": "Personalized advice based on fetched data and user's situation. Be clear about what is fact vs general guidance.",
    "basedOn": "fetched_data or general_knowledge",
    "disclaimer": "Always include: 'This analysis is based on publicly available data. Verify with IRCC or a licensed RCIC for your specific case.'"
  }
}

If there are no fetched updates at all, return a response that clearly states no verified data is available yet, with links to check official sources directly.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    clearTimeout(timeout);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    const data = JSON.parse(content);
    data._meta = {
      updatesInDatabase: updates?.length || 0,
      analyzedAt: new Date().toISOString(),
      dataSource: "ingested_official_sources",
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("PR tracker AI error:", error);
    return NextResponse.json({ error: "Failed to generate analysis" }, { status: 500 });
  }
}
