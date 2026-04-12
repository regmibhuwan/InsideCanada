"use client";

import { useState, useEffect } from "react";
import { useCase } from "@/lib/use-case";
import { formatDate, prStageLabel, prProgramLabel } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, BarChart3, TrendingUp, Clock, Globe, Target,
  AlertTriangle, Lightbulb, ArrowRight, RefreshCw, FileCheck
} from "lucide-react";

interface DrawData {
  draws: Array<{
    date: string;
    program: string;
    crs_cutoff: number;
    invitations: number;
    details?: string;
  }>;
  processingTimes: Array<{
    program: string;
    estimated_months: string;
  }>;
  trends: {
    crs_trend: string;
    invitation_trend: string;
    advice: string;
  };
  alternatives: Array<{
    pathway: string;
    description: string;
    advantage: string;
    eligibility_hint: string;
  }>;
  nocInsights: Array<{
    noc_code: string;
    title: string;
    teer: string;
    demand: string;
    recent_draws: string;
  }>;
}

export default function PRTrackerPage() {
  const { userCase, loading } = useCase();
  const [drawData, setDrawData] = useState<DrawData | null>(null);
  const [loadingDraws, setLoadingDraws] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const hasApplied = userCase.profile?.has_applied_pr;
  const prApps = userCase.prApplications || [];
  const latestApp = prApps[0];

  useEffect(() => {
    if (!loading && userCase.profile) {
      fetchDrawData();
    }
  }, [loading]);

  async function fetchDrawData() {
    setLoadingDraws(true);
    setDrawError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const res = await fetch("/api/ai/pr-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program: latestApp?.program || userCase.profile?.pr_application_program || "cec",
          noc_code: latestApp?.noc_code_applied || userCase.workHistory?.[0]?.noc_code || "",
          province: latestApp?.province_applied || userCase.profile?.current_province || "",
          crs_score: latestApp?.ita_crs_score || null,
          has_applied: hasApplied,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        setDrawData(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setDrawError(errData.error === "AI not configured"
          ? "AI is not configured yet. Add your OPENAI_API_KEY in environment variables and redeploy."
          : "Failed to load data. Please try again.");
      }
    } catch (e: any) {
      if (e?.name === "AbortError") {
        setDrawError("Request timed out. The AI service may be slow — try again.");
      } else {
        setDrawError("Could not connect to the AI service. Please try again later.");
      }
      console.error("Failed to fetch draw data:", e);
    }
    setLoadingDraws(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">PR Tracker</h1>
          <p className="text-muted-foreground mt-1">
            {hasApplied
              ? "Monitor your application, recent draws, processing times, and alternatives."
              : "Explore Express Entry draws, processing times, and PR pathways."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDrawData} disabled={loadingDraws}>
          <RefreshCw className={`h-4 w-4 ${loadingDraws ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {hasApplied && latestApp && (
        <ApplicationProgressCard app={latestApp} />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full">
          <TabsTrigger value="overview"><BarChart3 className="h-4 w-4 mr-1.5 hidden sm:inline" />Draws</TabsTrigger>
          <TabsTrigger value="processing"><Clock className="h-4 w-4 mr-1.5 hidden sm:inline" />Processing</TabsTrigger>
          <TabsTrigger value="noc"><Target className="h-4 w-4 mr-1.5 hidden sm:inline" />NOC Insights</TabsTrigger>
          <TabsTrigger value="alternatives"><Globe className="h-4 w-4 mr-1.5 hidden sm:inline" />Alternatives</TabsTrigger>
          <TabsTrigger value="tips"><Lightbulb className="h-4 w-4 mr-1.5 hidden sm:inline" />Strategy</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <DrawsTab drawData={drawData} loading={loadingDraws} error={drawError} userCrs={latestApp?.ita_crs_score} onRetry={fetchDrawData} />
        </TabsContent>
        <TabsContent value="processing">
          <ProcessingTimesTab drawData={drawData} loading={loadingDraws} error={drawError} app={latestApp} onRetry={fetchDrawData} />
        </TabsContent>
        <TabsContent value="noc">
          <NOCInsightsTab drawData={drawData} loading={loadingDraws} error={drawError} onRetry={fetchDrawData} />
        </TabsContent>
        <TabsContent value="alternatives">
          <AlternativesTab drawData={drawData} loading={loadingDraws} error={drawError} onRetry={fetchDrawData} />
        </TabsContent>
        <TabsContent value="tips">
          <StrategyTab drawData={drawData} loading={loadingDraws} hasApplied={hasApplied} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ApplicationProgressCard({ app }: { app: any }) {
  const stages = [
    "profile_created", "ita_received", "submitted", "aor_received",
    "biometrics_requested", "medical_requested", "background_check",
    "additional_docs", "decision_made", "approved"
  ];
  const currentIdx = stages.indexOf(app.current_stage);
  const progress = currentIdx >= 0 ? Math.round(((currentIdx + 1) / stages.length) * 100) : 0;

  const daysSinceSubmission = app.submission_date
    ? Math.floor((Date.now() - new Date(app.submission_date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const daysSinceAOR = app.aor_date
    ? Math.floor((Date.now() - new Date(app.aor_date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileCheck className="h-6 w-6 text-primary" />
            <div>
              <h3 className="font-semibold">{prProgramLabel(app.program)}</h3>
              <p className="text-sm text-muted-foreground">
                {app.application_number && <span className="font-mono mr-3">{app.application_number}</span>}
                Stage: {prStageLabel(app.current_stage)}
              </p>
            </div>
          </div>
          <div className="text-right">
            {daysSinceSubmission !== null && (
              <p className="text-sm font-medium">{daysSinceSubmission} days since submission</p>
            )}
            {daysSinceAOR !== null && (
              <p className="text-xs text-muted-foreground">{daysSinceAOR} days since AOR</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className="bg-primary h-3 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Profile</span>
            <span>Decision</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MilestoneChip label="Biometrics" done={app.biometrics_done} date={app.biometrics_date} />
          <MilestoneChip label="Medical" done={app.medical_passed} date={app.medical_exam_date} />
          <MilestoneChip label="Background" done={!!app.background_check_started} date={app.background_check_started} />
          <MilestoneChip label="Decision" done={app.current_stage === "approved" || app.current_stage === "refused"} date={app.decision_date} />
        </div>
      </CardContent>
    </Card>
  );
}

function MilestoneChip({ label, done, date }: { label: string; done: boolean; date?: string }) {
  return (
    <div className={`p-2 rounded-lg border text-center text-xs ${done ? "bg-green-50 border-green-200" : "bg-muted"}`}>
      <p className="font-medium">{label}</p>
      {done ? (
        <p className="text-green-600">{date ? formatDate(date) : "Done"}</p>
      ) : (
        <p className="text-muted-foreground">Pending</p>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin mb-3" />
      <p className="text-sm">Fetching latest immigration data...</p>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertTriangle className="h-8 w-8 text-amber-500 mb-3" />
      <p className="text-sm text-muted-foreground mb-4">{error}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-1" /> Try Again
      </Button>
    </div>
  );
}

function DrawsTab({ drawData, loading, error, userCrs, onRetry }: { drawData: DrawData | null; loading: boolean; error: string | null; userCrs?: number; onRetry: () => void }) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Recent Express Entry Draws
        </CardTitle>
        <CardDescription>
          Latest IRCC draw results, CRS cutoffs, and invitation counts.
          {userCrs && <span className="font-medium text-primary ml-1">Your CRS: {userCrs}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!drawData?.draws?.length ? (
          <p className="text-center py-8 text-muted-foreground">No draw data available. Click Refresh to load.</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
              <span>Date</span>
              <span>Program</span>
              <span>CRS Cutoff</span>
              <span>Invitations</span>
            </div>
            {drawData.draws.map((draw, i) => (
              <div key={i} className={`grid grid-cols-4 gap-2 text-sm p-3 rounded-lg border ${userCrs && draw.crs_cutoff <= userCrs ? "bg-green-50 border-green-200" : ""}`}>
                <span className="font-medium">{draw.date}</span>
                <span>{draw.program}</span>
                <span className="font-semibold">{draw.crs_cutoff}</span>
                <span>{draw.invitations.toLocaleString()}</span>
              </div>
            ))}

            {drawData.trends && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                <h4 className="font-medium text-sm">Trend Analysis</h4>
                <p className="text-sm"><strong>CRS:</strong> {drawData.trends.crs_trend}</p>
                <p className="text-sm"><strong>Invitations:</strong> {drawData.trends.invitation_trend}</p>
                <p className="text-sm text-primary"><strong>Advice:</strong> {drawData.trends.advice}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProcessingTimesTab({ drawData, loading, error, app, onRetry }: { drawData: DrawData | null; loading: boolean; error: string | null; app?: any; onRetry: () => void }) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;

  const daysSinceSubmission = app?.submission_date
    ? Math.floor((Date.now() - new Date(app.submission_date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Processing Times
        </CardTitle>
        <CardDescription>Estimated IRCC processing times by program.</CardDescription>
      </CardHeader>
      <CardContent>
        {!drawData?.processingTimes?.length ? (
          <p className="text-center py-8 text-muted-foreground">No processing time data available. Click Refresh.</p>
        ) : (
          <div className="space-y-3">
            {drawData.processingTimes.map((pt, i) => {
              const months = parseFloat(pt.estimated_months);
              const isYourProgram = app && pt.program.toLowerCase().includes(app.program);

              return (
                <div key={i} className={`p-4 rounded-lg border ${isYourProgram ? "border-primary/30 bg-primary/5" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{pt.program}</span>
                      {isYourProgram && <Badge variant="default">Your Program</Badge>}
                    </div>
                    <span className="text-lg font-semibold">{pt.estimated_months}</span>
                  </div>
                  {isYourProgram && daysSinceSubmission !== null && (
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Your wait: {daysSinceSubmission} days</span>
                        <span>Est: {Math.round(months * 30)} days</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${daysSinceSubmission > months * 30 ? "bg-orange-500" : "bg-primary"}`}
                          style={{ width: `${Math.min((daysSinceSubmission / (months * 30)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NOCInsightsTab({ drawData, loading, error, onRetry }: { drawData: DrawData | null; loading: boolean; error: string | null; onRetry: () => void }) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          NOC Category Insights
        </CardTitle>
        <CardDescription>Which occupations and NOC categories are receiving invitations.</CardDescription>
      </CardHeader>
      <CardContent>
        {!drawData?.nocInsights?.length ? (
          <p className="text-center py-8 text-muted-foreground">No NOC insight data available. Click Refresh.</p>
        ) : (
          <div className="space-y-3">
            {drawData.nocInsights.map((noc, i) => (
              <div key={i} className="p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{noc.title}</span>
                    <span className="text-sm text-muted-foreground ml-2">NOC {noc.noc_code}</span>
                  </div>
                  <Badge variant={noc.demand === "High" ? "success" : noc.demand === "Medium" ? "warning" : "secondary"}>
                    {noc.demand} Demand
                  </Badge>
                </div>
                <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                  <span>TEER {noc.teer}</span>
                  <span>{noc.recent_draws}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AlternativesTab({ drawData, loading, error, onRetry }: { drawData: DrawData | null; loading: boolean; error: string | null; onRetry: () => void }) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Alternative Pathways
        </CardTitle>
        <CardDescription>Other immigration pathways you might consider — French streams, PNP, pilot programs.</CardDescription>
      </CardHeader>
      <CardContent>
        {!drawData?.alternatives?.length ? (
          <p className="text-center py-8 text-muted-foreground">No alternative pathway data. Click Refresh.</p>
        ) : (
          <div className="space-y-4">
            {drawData.alternatives.map((alt, i) => (
              <div key={i} className="p-4 rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{alt.pathway}</h4>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm">{alt.description}</p>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-green-600 font-medium">Advantage: {alt.advantage}</span>
                  <span className="text-muted-foreground">{alt.eligibility_hint}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StrategyTab({ drawData, loading, hasApplied }: { drawData: DrawData | null; loading: boolean; hasApplied: boolean }) {
  if (loading) return <LoadingState />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          {hasApplied ? "While You Wait" : "PR Strategy Tips"}
        </CardTitle>
        <CardDescription>
          {hasApplied
            ? "Things you can do while waiting for your PR decision."
            : "Strategic advice to improve your chances of getting PR."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {hasApplied ? (
            <>
              <StrategyItem
                title="Monitor GCMS Notes"
                desc="Order GCMS notes through an ATIP request to check your application's progress. Takes 30+ days but gives detailed processing stage info."
              />
              <StrategyItem
                title="Keep Documents Current"
                desc="Ensure your passport, police certificates, and medical exams remain valid. IRCC may request updated versions if they expire during processing."
              />
              <StrategyItem
                title="Report Changes Immediately"
                desc="New job, address change, new family member, passport renewal — report everything through your IRCC account via the 'Report a change' webform."
              />
              <StrategyItem
                title="Prepare for Landing"
                desc="Start gathering documents for your landing: proof of funds, address, employment letter. Be ready when COPR arrives."
              />
              <StrategyItem
                title="Maintain Legal Status"
                desc="Your work permit must remain valid. If it's expiring, apply for a BOWP (Bridging Open Work Permit) or extension before it expires."
              />
              <StrategyItem
                title="Explore French Language"
                desc="Even after applying, French proficiency can help with future applications, PNP nominations, or if you need to reapply. TEF/TCF scores add significant CRS points."
              />
            </>
          ) : (
            <>
              <StrategyItem
                title="Maximize CRS Score"
                desc="Focus on language scores (CLB 9+ = big points), get a second language (French gives bonus), and leverage Canadian work experience."
              />
              <StrategyItem
                title="Provincial Nominee Programs"
                desc="PNP nomination adds 600 CRS points — virtually guaranteeing an ITA. Research OINP, BCPNP, SINP, and AIPP streams matching your NOC."
              />
              <StrategyItem
                title="French Language Advantage"
                desc="Learning French and taking TEF/TCF can add up to 50+ CRS points and qualifies you for French-speaking category draws with lower CRS cutoffs."
              />
              <StrategyItem
                title="Category-Based Draws"
                desc="IRCC now runs category-based draws targeting specific occupations (healthcare, STEM, trades, transport, agriculture). Check if your NOC qualifies."
              />
              <StrategyItem
                title="Education Credential Assessment"
                desc="Get your foreign credentials assessed by WES/IQAS if you haven't already. This unlocks education CRS points."
              />
              <StrategyItem
                title="Job Offer / LMIA"
                desc="A valid job offer with LMIA adds 50-200 CRS points. Discuss with your employer about supporting your PR."
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StrategyItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-4 rounded-lg border hover:border-primary/30 transition-colors">
      <h4 className="font-medium mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
