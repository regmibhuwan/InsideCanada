"use client";

import { useCase } from "@/lib/use-case";
import { runRiskAnalysis } from "@/lib/risk-engine";
import { runEligibilityCheck } from "@/lib/eligibility-engine";
import { daysUntil, formatDate, urgencyColor, severityColor, statusLabel, permitLabel, calculateCanadianExperienceMonths, prStageLabel, prProgramLabel } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield, Clock, AlertTriangle, ArrowRight, FileCheck, Brain,
  CheckCircle2, XCircle, Briefcase, GraduationCap,
  MapPin, Loader2, ChevronRight, TrendingUp, BarChart3, CalendarClock
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

export default function DashboardPage() {
  const { userCase, loading } = useCase();

  const riskAlerts = useMemo(() => {
    if (!userCase.profile) return [];
    return runRiskAnalysis(userCase);
  }, [userCase]);

  const eligibility = useMemo(() => {
    if (!userCase.profile) return [];
    return runEligibilityCheck(userCase);
  }, [userCase]);

  const canadianMonths = useMemo(() => {
    return calculateCanadianExperienceMonths(userCase.workHistory);
  }, [userCase.workHistory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your case...</p>
        </div>
      </div>
    );
  }

  if (!userCase.profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Unable to load profile. Please sign in again.</p>
      </div>
    );
  }

  const hasApplied = userCase.profile.has_applied_pr;
  const latestApp = userCase.prApplications?.[0];
  const activePermit = userCase.permits.find(p => p.status === "active");
  const permitDays = activePermit ? daysUntil(activePermit.expiry_date) : null;
  const passport = userCase.passports[0];
  const passportDays = passport ? daysUntil(passport.expiry_date) : null;
  const criticalAlerts = riskAlerts.filter(a => a.severity === "critical");
  const highAlerts = riskAlerts.filter(a => a.severity === "high");

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome, {userCase.profile.full_name?.split(" ")[0] || "there"}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">{statusLabel(userCase.profile.immigration_status)}</Badge>
            {hasApplied && <Badge variant="default">PR Applied</Badge>}
            {userCase.profile.current_province && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {userCase.profile.current_province}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasApplied && (
            <Link href="/pr-tracker">
              <Button variant="outline">
                <BarChart3 className="h-4 w-4" />
                PR Tracker
              </Button>
            </Link>
          )}
          <Link href="/advisor">
            <Button>
              <Brain className="h-4 w-4" />
              Ask AI Advisor
            </Button>
          </Link>
        </div>
      </div>

      {/* PR Application Progress Banner (for applicants) */}
      {hasApplied && latestApp && (
        <PRApplicationBanner app={latestApp} />
      )}

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="space-y-3">
          {criticalAlerts.map((alert) => (
            <div key={alert.id} className="flex items-start gap-3 p-4 rounded-xl border-2 border-red-300 bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-red-900">{alert.title}</h3>
                <p className="text-sm text-red-700 mt-1">{alert.message}</p>
              </div>
              {alert.action_url && (
                <Link href={alert.action_url}>
                  <Button size="sm" variant="destructive">{alert.action_label || "Take Action"}</Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {hasApplied && latestApp ? (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">PR Application</p>
                  <p className="text-lg font-bold mt-1">{prStageLabel(latestApp.current_stage)}</p>
                  {latestApp.submission_date && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {Math.floor((Date.now() - new Date(latestApp.submission_date).getTime()) / (1000 * 60 * 60 * 24))} days waiting
                    </p>
                  )}
                </div>
                <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <FileCheck className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Work Permit</p>
                  {activePermit ? (
                    <>
                      <p className="text-2xl font-bold mt-1">
                        {permitDays !== null && permitDays >= 0 ? `${permitDays}d` : "Expired"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {permitDays !== null && permitDays >= 0 ? `Expires ${formatDate(activePermit.expiry_date)}` : "Take action now"}
                      </p>
                    </>
                  ) : (
                    <p className="text-lg font-medium mt-1 text-muted-foreground">Not set</p>
                  )}
                </div>
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${permitDays !== null ? urgencyColor(permitDays) : "bg-gray-100"}`}>
                  <Clock className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Canadian Experience</p>
                <p className="text-2xl font-bold mt-1">{canadianMonths}mo</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {canadianMonths >= 12 ? "CEC eligible" : `${12 - canadianMonths}mo to CEC`}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Documents</p>
                <p className="text-2xl font-bold mt-1">{userCase.documents.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">In your vault</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
                <FileCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Risk Alerts</p>
                <p className="text-2xl font-bold mt-1">{riskAlerts.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {criticalAlerts.length > 0 ? `${criticalAlerts.length} critical` : "No critical issues"}
                </p>
              </div>
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${criticalAlerts.length > 0 ? "bg-red-50" : "bg-green-50"}`}>
                <Shield className={`h-6 w-6 ${criticalAlerts.length > 0 ? "text-red-600" : "text-green-600"}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Risk Alerts */}
          {highAlerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Attention Needed
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {highAlerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg border ${severityColor(alert.severity)}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{alert.title}</p>
                      <p className="text-xs mt-1 opacity-80">{alert.message}</p>
                    </div>
                    {alert.action_url && (
                      <Link href={alert.action_url}>
                        <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />
                      </Link>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* PR Pathway Overview — different card for applicants */}
          {hasApplied ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Application Overview
                </CardTitle>
                <CardDescription>Your PR application status and what to do while waiting</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Keep Valid</p>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li className="flex items-center gap-2">
                        {activePermit ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                        Work Permit
                      </li>
                      <li className="flex items-center gap-2">
                        {passport ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                        Passport
                      </li>
                      <li className="flex items-center gap-2">
                        {userCase.languageTests.length > 0 ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                        Language Tests
                      </li>
                    </ul>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Application Milestones</p>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li className="flex items-center gap-2">
                        {latestApp?.biometrics_done ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                        Biometrics
                      </li>
                      <li className="flex items-center gap-2">
                        {latestApp?.medical_passed ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                        Medical Exam
                      </li>
                      <li className="flex items-center gap-2">
                        {latestApp?.background_check_started ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                        Background Check
                      </li>
                    </ul>
                  </div>
                </div>
                <Link href="/pr-tracker">
                  <Button variant="outline" className="w-full mt-2">
                    View PR Tracker — Draws, Processing Times & More
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  PR Pathway Snapshot
                </CardTitle>
                <CardDescription>Your eligibility for major PR programs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {eligibility.map((result) => (
                  <div key={result.program} className="flex items-center gap-3 p-3 rounded-lg border">
                    {result.eligible ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{result.program}</p>
                      {result.eligible ? (
                        <p className="text-xs text-green-600 mt-0.5">You appear eligible</p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {result.missingRequirements[0]}
                        </p>
                      )}
                    </div>
                    <Badge variant={result.eligible ? "success" : "secondary"}>
                      {result.confidence}
                    </Badge>
                  </div>
                ))}
                <Link href="/eligibility">
                  <Button variant="outline" className="w-full mt-2">
                    Full Eligibility Check
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  Work History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userCase.workHistory.length > 0 ? (
                  <div className="space-y-2">
                    {userCase.workHistory.slice(0, 3).map((job) => (
                      <div key={job.id} className="text-sm">
                        <p className="font-medium">{job.job_title}</p>
                        <p className="text-muted-foreground text-xs">{job.employer_name}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No work history added yet</p>
                )}
                <Link href="/profile">
                  <Button variant="ghost" size="sm" className="mt-3 px-0">
                    Manage <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Education
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userCase.educationHistory.length > 0 ? (
                  <div className="space-y-2">
                    {userCase.educationHistory.slice(0, 3).map((edu) => (
                      <div key={edu.id} className="text-sm">
                        <p className="font-medium">{edu.program_name}</p>
                        <p className="text-muted-foreground text-xs">{edu.institution_name}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No education added yet</p>
                )}
                <Link href="/profile">
                  <Button variant="ghost" size="sm" className="mt-3 px-0">
                    Manage <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Document Readiness */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Document Readiness</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Track which documents you have ready for your application.
                </p>
                <Link href="/documents">
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    Check Documents
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Key Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarClock className="h-4 w-4" />
                Key Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activePermit && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{permitLabel(activePermit.permit_type)}</span>
                  <span className={`font-medium ${permitDays !== null && permitDays <= 90 ? "text-red-600" : ""}`}>
                    {formatDate(activePermit.expiry_date)}
                  </span>
                </div>
              )}
              {passport && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Passport</span>
                  <span className={`font-medium ${passportDays !== null && passportDays <= 180 ? "text-amber-600" : ""}`}>
                    {formatDate(passport.expiry_date)}
                  </span>
                </div>
              )}
              {userCase.languageTests[0] && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Language Test</span>
                  <span className="font-medium">
                    {formatDate(userCase.languageTests[0].expiry_date)}
                  </span>
                </div>
              )}
              {hasApplied && latestApp?.submission_date && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">PR Submitted</span>
                  <span className="font-medium text-primary">
                    {formatDate(latestApp.submission_date)}
                  </span>
                </div>
              )}
              {!activePermit && !passport && userCase.languageTests.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Add your permits and documents to see key dates
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {hasApplied && (
                <Link href="/pr-tracker" className="block">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <BarChart3 className="h-4 w-4 mr-2" /> Check Latest Draws
                  </Button>
                </Link>
              )}
              <Link href="/profile" className="block">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Briefcase className="h-4 w-4 mr-2" /> Add Work Experience
                </Button>
              </Link>
              <Link href="/documents" className="block">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <FileCheck className="h-4 w-4 mr-2" /> Upload Document
                </Button>
              </Link>
              <Link href="/advisor" className="block">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Brain className="h-4 w-4 mr-2" /> Ask a Question
                </Button>
              </Link>
              <Link href="/escalation" className="block">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Shield className="h-4 w-4 mr-2" /> Talk to a Professional
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PRApplicationBanner({ app }: { app: any }) {
  const stages = [
    "profile_created", "ita_received", "submitted", "aor_received",
    "biometrics_requested", "medical_requested", "background_check",
    "additional_docs", "decision_made", "approved"
  ];
  const currentIdx = stages.indexOf(app.current_stage);
  const progress = currentIdx >= 0 ? Math.round(((currentIdx + 1) / stages.length) * 100) : 0;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-blue-50/50">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            <span className="font-semibold">{prProgramLabel(app.program)}</span>
            <Badge variant={app.current_stage === "approved" ? "success" : app.current_stage === "refused" ? "danger" : "warning"}>
              {prStageLabel(app.current_stage)}
            </Badge>
          </div>
          <Link href="/pr-tracker">
            <Button variant="ghost" size="sm">
              Details <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div className="bg-primary h-2 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
          <span>Profile Created</span>
          <span>{progress}%</span>
          <span>PR Approved</span>
        </div>
      </CardContent>
    </Card>
  );
}
