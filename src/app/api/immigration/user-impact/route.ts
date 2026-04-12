import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const url = new URL(request.url);
  const profileType = url.searchParams.get("profileType") || "all";

  const groupMapping: Record<string, string[]> = {
    student: ["student_visa", "pgwp_applicant", "all"],
    worker: ["work_permit", "pgwp_holder", "all"],
    applied: ["pr_applicant", "ee_candidate", "all"],
    pending: ["pr_applicant", "all"],
    pgwp: ["pgwp_holder", "pgwp_applicant", "all"],
    pnp: ["pnp_applicant", "all"],
    all: ["all"],
  };

  const groups = groupMapping[profileType] || ["all"];

  const { data, error } = await supabase
    .from("immigration_updates")
    .select("*")
    .overlaps("affected_groups", groups)
    .order("detected_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ updates: [], error: error.message });
  }

  return NextResponse.json({ updates: data || [], profileType, groups });
}
