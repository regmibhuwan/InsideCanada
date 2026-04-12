import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("immigration_updates")
    .select("*")
    .in("urgency", ["critical", "high"])
    .order("detected_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ alerts: [], error: error.message });
  }

  return NextResponse.json({ alerts: data || [] });
}
