import { NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";

const CONTEXT_SOURCES: Record<string, { name: string; url: string }[]> = {
  pgwp: [
    { name: "PGWP Eligibility", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/post-graduation-work-permit.html" },
    { name: "Language Requirements", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/become-candidate/eligibility/language-requirements.html" },
  ],
  pnp: [
    { name: "Provincial Nominees", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees.html" },
    { name: "Processing Times", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html" },
  ],
  ee: [
    { name: "Express Entry", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html" },
    { name: "Processing Times", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html" },
  ],
  ns: [
    { name: "Nova Scotia Immigration", url: "https://novascotiaimmigration.com/" },
    { name: "NSNP Programs", url: "https://novascotiaimmigration.com/move-here/" },
  ],
  general: [
    { name: "IRCC Notices", url: "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices.html" },
    { name: "IRCC News", url: "https://www.canada.ca/en/immigration-refugees-citizenship/news/news-releases.html" },
  ],
};

function extractPageText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 6000);
}

export async function POST(request: Request) {
  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const body = await request.json();
  const { province, status, stream, has_applied, noc_code } = body;

  // Determine which sources to fetch
  const sourceKeys: string[] = ["general"];
  if (status === "pgwp_holder" || status === "student_visa") sourceKeys.push("pgwp");
  if (stream?.includes("pnp") || stream === "nsnp" || stream === "atlantic") sourceKeys.push("pnp");
  if (stream === "cec" || stream === "fsw" || stream === "fst") sourceKeys.push("ee");
  if (province?.toLowerCase().includes("nova scotia") || stream === "nsnp") sourceKeys.push("ns");

  const allSources = [...new Map(sourceKeys.flatMap(k => CONTEXT_SOURCES[k] || []).map(s => [s.url, s])).values()];

  // Fetch pages in parallel
  const fetched: { name: string; url: string; text: string }[] = [];
  await Promise.all(
    allSources.slice(0, 5).map(async (source) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(source.url, {
          signal: controller.signal,
          headers: { "User-Agent": "InsideCanada/1.0" },
        });
        clearTimeout(timeout);
        if (res.ok) {
          const html = await res.text();
          fetched.push({ name: source.name, url: source.url, text: extractPageText(html) });
        }
      } catch { /* skip failed fetches */ }
    })
  );

  if (fetched.length === 0) {
    return NextResponse.json({ cards: [], error: "Could not fetch any sources" });
  }

  const sourceContext = fetched.map(f => `[${f.name}] (${f.url}):\n${f.text.slice(0, 2500)}`).join("\n\n---\n\n");

  const prompt = `You are a Canadian immigration assistant. Generate personalized context cards from LIVE official source pages.

STRICT RULES:
- ONLY use information found in the source text below. Do NOT invent dates, fees, processing times, or draw results.
- If a source doesn't contain specific data, say what the page covers generally.
- Every card MUST reference which source it came from.

USER PROFILE:
- Province: ${province || "Not specified"}
- Status: ${status || "Not specified"}
- Stream: ${stream || "Not specified"}
- Applied for PR: ${has_applied ? "Yes" : "No"}
- NOC: ${noc_code || "Not specified"}

LIVE SOURCE DATA:
${sourceContext}

Return ONLY valid JSON:
{
  "cards": [
    {
      "type": "live_context",
      "title": "Short descriptive title based on source content",
      "summary": "2-3 sentences summarizing what the source page currently says. Only facts from the source.",
      "whyThisMatters": "1 sentence explaining why this is relevant to THIS user specifically",
      "nextAction": "1 short actionable step for the user",
      "sourceName": "Name of the source",
      "sourceUrl": "URL of the source",
      "category": "program_info|eligibility|processing|requirement|news",
      "relevanceToUser": "high|medium|low"
    }
  ]
}

Generate 3-5 cards. Prioritize:
${province?.toLowerCase().includes("nova scotia") ? "- Nova Scotia specific content FIRST" : ""}
${status === "pgwp_holder" ? "- PGWP eligibility, expiry risks, work conditions" : ""}
${has_applied ? "- Processing status, what to do while waiting, keeping documents valid" : "- Eligibility requirements, how to apply, document preparation"}
${stream?.includes("pnp") ? "- Provincial nominee program structure, streams, requirements" : ""}

Each card must have a real source URL from the fetched data. Never make up URLs.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    clearTimeout(timeout);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ cards: [] });
    }

    const data = JSON.parse(content);
    data._meta = {
      sourcesFetched: fetched.length,
      sourcesAttempted: allSources.length,
      fetchedAt: new Date().toISOString(),
      sourceNames: fetched.map(f => f.name),
    };

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ cards: [], error: "AI analysis failed" });
  }
}
