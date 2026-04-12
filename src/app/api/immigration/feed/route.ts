import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const TYPE_TO_CATEGORIES: Record<string, string[]> = {
  pgwp: ["pgwp_update", "eligibility_change", "transition_rule"],
  pr: ["policy_change", "rule_change", "eligibility_change", "levels_plan"],
  "processing-times": ["processing_time"],
  "express-entry": ["express_entry_draw", "category_based_draw"],
  pnp: ["pnp_update"],
  all: [],
};

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "all";
  const limit = parseInt(url.searchParams.get("limit") || "30");

  const categories = TYPE_TO_CATEGORIES[type] || [];

  let query = supabase
    .from("immigration_updates")
    .select("*")
    .order("detected_at", { ascending: false })
    .limit(limit);

  if (categories.length > 0) {
    query = query.in("category", categories);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ updates: [], error: error.message });
  }

  return NextResponse.json({ updates: data || [], type, fetchedAt: new Date().toISOString() });
}
