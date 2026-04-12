import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const category = url.searchParams.get("category");
  const urgency = url.searchParams.get("urgency");

  let query = supabase
    .from("immigration_updates")
    .select("*")
    .order("detected_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) query = query.eq("category", category);
  if (urgency) query = query.eq("urgency", urgency);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ updates: [], error: error.message });
  }

  return NextResponse.json({ updates: data || [] });
}
