import { NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";

export async function POST(request: Request) {
  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const body = await request.json();
  const { program, noc_code, province, crs_score, has_applied, pnp_stream } = body;

  const programDisplay = getProgramDisplay(program, pnp_stream, province);
  const isProvincialProgram = ["pnp", "pnp_ee", "atlantic", "nsnp", "oinp", "bcpnp", "sinp", "mpnp", "aipp", "nbpnp", "peipnp", "nlpnp", "ypnp"].includes(program);
  const isAIP = program === "atlantic" || program === "aipp";

  const prompt = `You are an expert Canadian immigration data analyst. Today's date is April 2026.
You MUST provide the most current data as of 2026. DO NOT use data from 2023 or 2024.

The user applied through: ${programDisplay}
${pnp_stream ? `PNP Stream: ${pnp_stream}` : ""}
Province: ${province || "Not specified"}
NOC code: ${noc_code || "Not specified"}
CRS score: ${crs_score || "Not specified"}
Has already applied: ${has_applied ? "Yes — waiting for decision" : "No — planning to apply"}

IMPORTANT CONTEXT:
- As of 2026, AIP (Atlantic Immigration Program) processing has gone up to 36-40+ months for many applicants
- PNP processing times vary wildly by province — some are 6 months, some 20+ months
- NSNP (Nova Scotia Nominee Program) has Labour Market Priorities, Physician, Entrepreneur, and International Graduate streams
- Express Entry-linked PNP nominations add 600 CRS points but still need federal processing
- Each province runs independent draws with different criteria

Return ONLY valid JSON (no markdown) with this structure:
{
  "yourStream": {
    "name": "${programDisplay}",
    "currentStatus": "Current status/overview of this specific program as of April 2026",
    "processingTime": "Current realistic processing time range for this program in 2026",
    "recentChanges": ["List of 3-5 recent changes/updates to this specific program in 2025-2026"],
    "tips": ["3-5 actionable tips specific to someone in this program"]
  },
  "processingTimes": [
    {
      "program": "Full program name",
      "estimated_months": "X-Y months (as of 2026)",
      "trend": "increasing|decreasing|stable",
      "notes": "Brief note about current situation"
    }
  ],
  "provincialUpdates": [
    {
      "province": "Province name",
      "program": "Specific PNP stream name",
      "latestUpdate": "What happened recently (2025-2026)",
      "nextDraw": "Expected next draw or intake info if known",
      "processingTime": "Current processing estimate",
      "isRelevant": true/false
    }
  ],
  "draws": [
    {
      "date": "YYYY-MM-DD",
      "program": "program name",
      "type": "express_entry|pnp_draw|aip_intake|provincial",
      "details": "CRS cutoff, invitations count, or provincial draw details",
      "relevantToUser": true/false
    }
  ],
  "alternatives": [
    {
      "pathway": "Pathway name",
      "description": "Brief description",
      "advantage": "Why consider this",
      "processingTime": "Current estimate",
      "eligibility_hint": "General eligibility note"
    }
  ],
  "trends": {
    "overall": "Brief overview of Canada immigration landscape in 2026",
    "userStreamTrend": "Specific trend analysis for the user's program",
    "advice": "Personalized advice based on their exact situation",
    "risks": "Any risks or concerns they should know about"
  }
}

CRITICAL INSTRUCTIONS:
${isProvincialProgram ? `
- Focus PRIMARILY on ${programDisplay} and provincial nominee programs — Express Entry is secondary
- Include details about ${province || "all provinces"}'s specific PNP streams, recent draws, intake windows
- Show processing times for PNP programs (both provincial and federal stages)
- Include other provinces' PNP programs as alternatives
` : ""}
${isAIP ? `
- Focus on Atlantic Immigration Program specifics — it has its OWN processing track
- AIP processing in 2026 has been extremely slow (36-40+ months for many)
- Include AIP-specific updates, employer designation status, and settlement plans
- Show NS, NB, PE, NL specific AIP streams
` : ""}
- Include processing times for ALL major programs: CEC, FSW, PNP (by province), AIP, Quebec, and category-based
- For provincialUpdates, include at least 8-10 provinces with their latest PNP info
- Include: NSNP, OINP, BCPNP, SINP, AIPP/AIP, NBPNP, MPNP, PEIPNP, NLPNP, YPNP
- For draws, include BOTH Express Entry rounds AND provincial PNP draws
- All data must reflect 2025-2026 reality — NOT 2023 data
- Processing times must be realistic for 2026 (many programs have increased)
- Be honest if processing times are long — users need real expectations`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    });

    clearTimeout(timeout);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    const data = JSON.parse(content);
    return NextResponse.json(data);
  } catch (error) {
    console.error("PR tracker AI error:", error);
    return NextResponse.json({ error: "Failed to generate data" }, { status: 500 });
  }
}

function getProgramDisplay(program: string, pnpStream?: string, province?: string): string {
  const map: Record<string, string> = {
    cec: "Canadian Experience Class (CEC)",
    fsw: "Federal Skilled Worker (FSW)",
    fst: "Federal Skilled Trades (FST)",
    pnp: `Provincial Nominee Program${province ? ` — ${province}` : ""}${pnpStream ? ` (${pnpStream})` : ""}`,
    pnp_ee: `PNP Express Entry Stream${province ? ` — ${province}` : ""}${pnpStream ? ` (${pnpStream})` : ""}`,
    nsnp: `Nova Scotia Nominee Program (NSNP)${pnpStream ? ` — ${pnpStream}` : ""}`,
    oinp: `Ontario Immigrant Nominee Program (OINP)${pnpStream ? ` — ${pnpStream}` : ""}`,
    bcpnp: `BC Provincial Nominee Program (BC PNP)${pnpStream ? ` — ${pnpStream}` : ""}`,
    sinp: `Saskatchewan Immigrant Nominee Program (SINP)${pnpStream ? ` — ${pnpStream}` : ""}`,
    mpnp: `Manitoba Provincial Nominee Program (MPNP)${pnpStream ? ` — ${pnpStream}` : ""}`,
    atlantic: "Atlantic Immigration Program (AIP)",
    aipp: "Atlantic Immigration Program (AIP)",
    sponsorship: "Family Sponsorship",
    rural: "Rural and Northern Immigration Pilot (RNIP)",
    quebec: "Quebec Immigration Programs",
    other: "Other Immigration Program",
  };
  return map[program] || program;
}
