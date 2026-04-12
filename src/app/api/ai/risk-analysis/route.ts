import { NextRequest, NextResponse } from "next/server";
import { runRiskAnalysis } from "@/lib/risk-engine";
import type { UserCase } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { userCase } = await request.json() as { userCase: UserCase };
    const alerts = runRiskAnalysis(userCase);
    return NextResponse.json({ alerts });
  } catch (error: any) {
    console.error("Risk analysis error:", error);
    return NextResponse.json({ alerts: [] }, { status: 500 });
  }
}
