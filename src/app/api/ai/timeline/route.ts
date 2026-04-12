import { NextRequest, NextResponse } from "next/server";
import { getOpenAI, SYSTEM_PROMPT } from "@/lib/openai";
import type { UserCase } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { userCase } = await request.json() as { userCase: UserCase };

    const openai = getOpenAI();
    if (!openai) {
      const defaultMilestones = [
        { type: "language_test_taken", title: "Take Language Test (IELTS/CELPIP)", description: "Book and complete your language test. Results are valid for 2 years.", target_date: null },
        { type: "eca_completed", title: "Get ECA for Foreign Education", description: "If you have foreign credentials, get them assessed by a designated organization.", target_date: null },
        { type: "one_year_experience", title: "Complete 1 Year Canadian Experience", description: "Accumulate 12 months of full-time skilled work experience in Canada.", target_date: null },
        { type: "express_entry_profile", title: "Create Express Entry Profile", description: "Submit your Express Entry profile on the IRCC website.", target_date: null },
        { type: "ita_received", title: "Receive ITA", description: "Wait for an Invitation to Apply based on your CRS score.", target_date: null },
        { type: "pr_application_submitted", title: "Submit PR Application", description: "Complete and submit your PR application within 60 days of ITA.", target_date: null },
        { type: "medical_exam_done", title: "Complete Medical Exam", description: "Complete your immigration medical exam with a designated panel physician.", target_date: null },
        { type: "pr_approved", title: "PR Approved", description: "Receive your Confirmation of Permanent Residence (COPR).", target_date: null },
      ];
      return NextResponse.json({ milestones: defaultMilestones });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `${SYSTEM_PROMPT}\n\nGenerate a personalized immigration timeline as JSON. Return an array of milestone objects with: type (string), title (string), description (string), target_date (string YYYY-MM-DD or null). Base milestones on the user's current status, permits, experience, and goals. Focus on practical, actionable milestones. Today's date: ${new Date().toISOString().split("T")[0]}`,
        },
        {
          role: "user",
          content: `Generate a personalized immigration timeline for this user:\n\nStatus: ${userCase.profile?.immigration_status}\nProvince: ${userCase.profile?.current_province || "unknown"}\nPermits: ${userCase.permits.map(p => `${p.permit_type} expires ${p.expiry_date}`).join(", ") || "none"}\nWork Experience: ${userCase.workHistory.length} jobs, ${userCase.workHistory.filter(w => w.is_canadian_experience).length} Canadian\nEducation: ${userCase.educationHistory.length} records\nLanguage Tests: ${userCase.languageTests.length}\nDocuments: ${userCase.documents.length}\n\nReturn only valid JSON array.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content || "{}";
    const parsed = JSON.parse(content);
    const milestones = parsed.milestones || parsed.timeline || [];

    return NextResponse.json({ milestones });
  } catch (error: any) {
    console.error("Timeline generation error:", error);
    return NextResponse.json({ milestones: [] }, { status: 500 });
  }
}
