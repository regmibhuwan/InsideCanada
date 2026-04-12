import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { scoreUpdates } from "@/lib/relevance-engine";
import type { UserCase } from "@/lib/types";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ updates: [], error: "Not authenticated" });
  }

  // Fetch user's full profile for relevance scoring
  const [
    { data: profile },
    { data: permits },
    { data: languageTests },
    { data: workHistory },
    { data: prApplications },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("permits").select("*").eq("user_id", user.id),
    supabase.from("language_tests").select("*").eq("user_id", user.id),
    supabase.from("work_history").select("*").eq("user_id", user.id),
    supabase.from("pr_applications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);

  // Fetch recent updates
  const { data: updates, error } = await supabase
    .from("immigration_updates")
    .select("*")
    .order("detected_at", { ascending: false })
    .limit(50);

  if (error || !updates) {
    return NextResponse.json({ updates: [], error: error?.message || "No updates" });
  }

  const userCase: UserCase = {
    profile: profile || {} as any,
    permits: permits || [],
    passports: [],
    languageTests: languageTests || [],
    workHistory: workHistory || [],
    educationHistory: [],
    documents: [],
    milestones: [],
    riskAlerts: [],
    prApplications: prApplications || [],
  };

  const scored = scoreUpdates(updates, userCase);

  return NextResponse.json({
    updates: scored.slice(0, 20),
    totalAvailable: updates.length,
    scoredAt: new Date().toISOString(),
  });
}
