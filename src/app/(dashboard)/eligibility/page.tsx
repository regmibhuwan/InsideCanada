"use client";

import { useMemo } from "react";
import { useCase } from "@/lib/use-case";
import { runEligibilityCheck } from "@/lib/eligibility-engine";
import { calculateCanadianExperienceMonths } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, XCircle, AlertTriangle, ArrowRight, Brain,
  Loader2, Target, Star, FileCheck, TrendingUp, ChevronRight
} from "lucide-react";
import Link from "next/link";

export default function EligibilityPage() {
  const { userCase, loading } = useCase();

  const results = useMemo(() => {
    if (!userCase.profile) return [];
    return runEligibilityCheck(userCase);
  }, [userCase]);

  const canadianMonths = useMemo(() => {
    return calculateCanadianExperienceMonths(userCase.workHistory);
  }, [userCase.workHistory]);

  const minCLB = useMemo(() => {
    if (!userCase.languageTests.length) return 0;
    const valid = userCase.languageTests.filter(t => new Date(t.expiry_date) > new Date());
    if (!valid.length) return 0;
    const latest = valid[0];
    const scores = [latest.clb_listening, latest.clb_reading, latest.clb_writing, latest.clb_speaking].filter(Boolean) as number[];
    return scores.length ? Math.min(...scores) : 0;
  }, [userCase.languageTests]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">PR Eligibility Check</h1>
        <p className="text-muted-foreground mt-1">
          See which programs you qualify for based on your current profile.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{canadianMonths}</p>
            <p className="text-xs text-muted-foreground mt-1">Months Canadian Experience</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{minCLB || "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">Minimum CLB Level</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{userCase.educationHistory.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Education Records</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{userCase.documents.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Documents Uploaded</p>
          </CardContent>
        </Card>
      </div>

      {/* Eligibility Results */}
      <div className="space-y-4">
        {results.map((result) => (
          <Card key={result.program} className={result.eligible ? "border-green-200" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {result.eligible ? (
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <XCircle className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <CardTitle>{result.program}</CardTitle>
                    <CardDescription>
                      {result.eligible ? "You appear eligible for this program" : "Not currently eligible — see what's needed"}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={result.eligible ? "success" : result.confidence === "medium" ? "warning" : "secondary"}>
                  {result.eligible ? "Eligible" : "Not Yet"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.missingRequirements.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
                    <XCircle className="h-4 w-4" /> Missing Requirements
                  </p>
                  <ul className="space-y-1.5">
                    {result.missingRequirements.map((req, i) => (
                      <li key={i} className="text-sm text-red-600 flex items-start gap-2 pl-5">
                        <span className="text-red-400 mt-1">•</span> {req}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.recommendations.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-1">
                    <Star className="h-4 w-4" /> Recommendations
                  </p>
                  <ul className="space-y-1.5">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-blue-600 flex items-start gap-2 pl-5">
                        <span className="text-blue-400 mt-1">•</span> {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTA */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Brain className="h-10 w-10 text-primary shrink-0" />
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-semibold">Need personalized advice?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Ask the AI Advisor for detailed guidance on your best PR pathway.
              </p>
            </div>
            <Link href="/advisor">
              <Button>
                <Brain className="h-4 w-4" /> Ask AI Advisor
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
