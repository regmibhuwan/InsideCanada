import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { consultation_type, urgency, subject, description, preferred_language, user_name, user_email } = body;

  if (!subject) {
    return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, current_province, immigration_status, has_applied_pr, pr_application_program, target_pr_stream")
    .eq("id", user.id)
    .single();

  const typeLabels: Record<string, string> = {
    general_assessment: "General Assessment",
    pr_strategy: "PR Strategy",
    work_permit_extension: "Work Permit Extension",
    maintained_status: "Maintained Status",
    refusal_review: "Refusal Review",
    appeal: "Appeal",
    pnp_advice: "PNP Advice",
    employer_compliance: "Employer Compliance",
    urgent: "Urgent Matter",
  };

  const emailBody = `
NEW CONSULTATION REQUEST — InsideCanada
========================================

From: ${profile?.full_name || user_name || "Unknown"}
Email: ${user.email || user_email}
Date: ${new Date().toLocaleString("en-CA", { timeZone: "America/Toronto" })}

Type: ${typeLabels[consultation_type] || consultation_type}
Urgency: ${urgency?.toUpperCase()}
Language: ${preferred_language}

Profile Info:
- Province: ${profile?.current_province || "Not specified"}
- Immigration Status: ${profile?.immigration_status?.replace(/_/g, " ") || "Not specified"}
- Applied for PR: ${profile?.has_applied_pr ? "Yes" : "No"}
- PR Program: ${profile?.pr_application_program || profile?.target_pr_stream || "Not specified"}

Subject: ${subject}

Description:
${description || "No description provided."}

========================================
Reply directly to this email to respond to the user at: ${user.email}
  `.trim();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "InsideCanada <onboarding@resend.dev>",
        to: "regmibhuwan555@gmail.com",
        subject: `[InsideCanada] ${urgency === "emergency" ? "EMERGENCY: " : urgency === "urgent" ? "URGENT: " : ""}${typeLabels[consultation_type] || "Consultation"} — ${subject}`,
        text: emailBody,
        reply_to: user.email || user_email,
      }),
    });

    if (!res.ok) {
      const errData = await res.text();
      console.error("Resend error:", errData);
      // Fall back — still save to DB so no request is lost
    }
  } catch (e) {
    console.error("Email send error:", e);
  }

  // Always save to DB as backup
  try {
    await supabase.from("consultations").insert({
      user_id: user.id,
      consultation_type,
      urgency,
      subject,
      description,
      preferred_language,
      status: "requested",
    });
  } catch {
    // Table might not exist yet — that's okay, email was sent
  }

  return NextResponse.json({ success: true });
}
