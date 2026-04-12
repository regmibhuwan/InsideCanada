import { NextRequest, NextResponse } from "next/server";
import { runEligibilityCheck } from "@/lib/eligibility-engine";
import type { UserCase } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { userCase } = await request.json() as { userCase: UserCase };
    const results = runEligibilityCheck(userCase);
    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Eligibility check error:", error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
