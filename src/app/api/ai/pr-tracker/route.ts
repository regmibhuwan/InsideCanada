import { NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";

export async function POST(request: Request) {
  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const body = await request.json();
  const { program, noc_code, province, crs_score, has_applied } = body;

  const prompt = `You are an expert Canadian immigration data analyst. Provide the latest Express Entry and immigration data as a JSON object.

Context:
- User's program: ${program || "Unknown"}
- User's NOC code: ${noc_code || "Not specified"}
- User's province: ${province || "Not specified"}
- User's CRS score: ${crs_score || "Not specified"}
- Has already applied: ${has_applied ? "Yes" : "No"}

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "draws": [
    {
      "date": "YYYY-MM-DD or month name format",
      "program": "program name (e.g., 'CEC', 'No Program Specified', 'Healthcare', 'STEM', 'French proficiency')",
      "crs_cutoff": number,
      "invitations": number,
      "details": "brief note"
    }
  ],
  "processingTimes": [
    {
      "program": "Full program name",
      "estimated_months": "X-Y months"
    }
  ],
  "trends": {
    "crs_trend": "Brief description of CRS score trends",
    "invitation_trend": "Brief description of invitation volume trends",
    "advice": "Personalized advice based on the user's situation"
  },
  "alternatives": [
    {
      "pathway": "Pathway name",
      "description": "Brief description",
      "advantage": "Why consider this",
      "eligibility_hint": "General eligibility note"
    }
  ],
  "nocInsights": [
    {
      "noc_code": "XXXXX",
      "title": "Job title",
      "teer": "0-5",
      "demand": "High/Medium/Low",
      "recent_draws": "Brief note about recent draw inclusion"
    }
  ]
}

Include:
- The 8-10 most recent Express Entry draws (use your latest knowledge cutoff data)
- Processing times for CEC, FSW, PNP, Atlantic, and category-based programs
- 5-6 relevant NOC categories that are in demand or featured in category-based draws
- 4-5 alternative pathways including French language streams, PNPs, pilots
- Tailor the trends advice to the user's specific CRS score, NOC code, and province
- Be accurate with the data you do have, and indicate if data might be slightly dated`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

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
