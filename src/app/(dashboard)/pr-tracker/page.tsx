"use client";

import { useState, useEffect } from "react";
import { useCase } from "@/lib/use-case";
import { formatDate, prStageLabel, prProgramLabel } from "@/lib/utils";
import { getCategoryLabel, getCategoryColor, getUrgencyColor } from "@/lib/ircc-sources";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, BarChart3, TrendingUp, Clock, Globe, Target,
  AlertTriangle, Lightbulb, ArrowRight, RefreshCw, FileCheck,
  ExternalLink, Shield, Newspaper, Filter, Bell, Zap, CheckCircle2
} from "lucide-react";

interface ImmigrationUpdate {
  id: string;
  title: string;
  summary: string;
  plain_language: string;
  source_url: string;
  source_name: string;
  is_official: boolean;
  confidence_score: number;
  published_at: string;
  detected_at: string;
  category: string;
  urgency: string;
  affected_groups: string[];
  action_required: string | null;
  diff_snapshot: string | null;
}

export default function PRTrackerPage() {
  const { userCase, loading } = useCase();
  const [updates, setUpdates] = useState<ImmigrationUpdate[]>([]);
  const [alerts, setAlerts] = useState<ImmigrationUpdate[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("feed");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [aiDrawData, setAiDrawData] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const hasApplied = userCase.profile?.has_applied_pr;
  const prApps = userCase.prApplications || [];
  const latestApp = prApps[0];

  useEffect(() => {
    if (!loading) {
      fetchFeed();
      fetchAlerts();
    }
  }, [loading]);

  async function fetchFeed() {
    setLoadingFeed(true);
    setFeedError(null);
    try {
      const profileType = hasApplied ? "applied" :
        userCase.profile?.immigration_status === "pgwp_holder" ? "pgwp" :
        userCase.profile?.immigration_status === "student_visa" ? "student" : "all";

      const res = await fetch(`/api/immigration/user-impact?profileType=${profileType}`);
      if (res.ok) {
        const data = await res.json();
        setUpdates(data.updates || []);
      } else {
        setFeedError("Could not load updates. Try refreshing.");
      }
    } catch {
      setFeedError("Connection error. Try again.");
    }
    setLoadingFeed(false);
  }

  async function fetchAlerts() {
    try {
      const res = await fetch("/api/immigration/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch { /* silent */ }
  }

  async function fetchAIAnalysis() {
    setLoadingAI(true);
    try {
      const res = await fetch("/api/ai/pr-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program: latestApp?.program || userCase.profile?.pr_application_program || userCase.profile?.target_pr_stream || "cec",
          noc_code: latestApp?.noc_code_applied || userCase.workHistory?.[0]?.noc_code || "",
          province: latestApp?.province_applied || userCase.profile?.current_province || "",
          crs_score: latestApp?.ita_crs_score || userCase.profile?.crs_score || null,
          has_applied: hasApplied,
        }),
      });
      if (res.ok) {
        setAiDrawData(await res.json());
      }
    } catch { /* silent */ }
    setLoadingAI(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredUpdates = filterCategory === "all"
    ? updates
    : updates.filter(u => u.category === filterCategory);

  const categories = [...new Set(updates.map(u => u.category))];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">PR Tracker</h1>
          <p className="text-muted-foreground mt-1">
            Real-time IRCC updates, draws, processing times, and policy changes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchFeed} disabled={loadingFeed}>
            <RefreshCw className={`h-4 w-4 ${loadingFeed ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Critical alerts banner */}
      {alerts.filter(a => a.urgency === "critical").map(alert => (
        <div key={alert.id} className="flex items-start gap-3 p-4 rounded-xl border-2 border-red-300 bg-red-50">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">{alert.title}</h3>
            <p className="text-sm text-red-700 mt-1">{alert.plain_language || alert.summary}</p>
            {alert.action_required && (
              <p className="text-sm font-medium text-red-800 mt-2">Action: {alert.action_required}</p>
            )}
          </div>
          {alert.source_url && (
            <a href={alert.source_url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="destructive"><ExternalLink className="h-3 w-3" /> Source</Button>
            </a>
          )}
        </div>
      ))}

      {/* PR Application Progress (if applied) */}
      {hasApplied && latestApp && <ApplicationProgressCard app={latestApp} />}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full">
          <TabsTrigger value="feed"><Newspaper className="h-4 w-4 mr-1.5 hidden sm:inline" />Live Feed</TabsTrigger>
          <TabsTrigger value="draws"><BarChart3 className="h-4 w-4 mr-1.5 hidden sm:inline" />Draws & Data</TabsTrigger>
          <TabsTrigger value="processing"><Clock className="h-4 w-4 mr-1.5 hidden sm:inline" />Processing</TabsTrigger>
          <TabsTrigger value="alternatives"><Globe className="h-4 w-4 mr-1.5 hidden sm:inline" />Pathways</TabsTrigger>
          <TabsTrigger value="strategy"><Lightbulb className="h-4 w-4 mr-1.5 hidden sm:inline" />Strategy</TabsTrigger>
        </TabsList>

        {/* Live Feed */}
        <TabsContent value="feed">
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <button
                onClick={() => setFilterCategory("all")}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${filterCategory === "all" ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"}`}
              >All</button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${filterCategory === cat ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"}`}
                >{getCategoryLabel(cat)}</button>
              ))}
            </div>

            {loadingFeed ? (
              <div className="flex flex-col items-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-3" />
                <p className="text-sm">Loading latest updates...</p>
              </div>
            ) : feedError ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12">
                  <AlertTriangle className="h-8 w-8 text-amber-500 mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">{feedError}</p>
                  <Button variant="outline" size="sm" onClick={fetchFeed}>
                    <RefreshCw className="h-4 w-4 mr-1" /> Try Again
                  </Button>
                </CardContent>
              </Card>
            ) : filteredUpdates.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12">
                  <Newspaper className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
                  <h3 className="font-semibold mb-1">No updates yet</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    The system will automatically fetch and classify IRCC updates.
                    You can also click &quot;Draws & Data&quot; for AI-powered analysis.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredUpdates.map(update => (
                  <UpdateCard key={update.id} update={update} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* AI Draws & Data */}
        <TabsContent value="draws">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Express Entry Draw Analysis
                  </CardTitle>
                  <CardDescription>AI-powered analysis of recent draws, trends, and projections.</CardDescription>
                </div>
                <Button onClick={fetchAIAnalysis} disabled={loadingAI} size="sm">
                  {loadingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  {aiDrawData ? "Refresh" : "Load Analysis"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingAI ? (
                <div className="flex flex-col items-center py-12 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-3" />
                  <p className="text-sm">AI is analyzing the latest draw data...</p>
                </div>
              ) : !aiDrawData ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Click &quot;Load Analysis&quot; to get AI-powered draw insights personalized to your profile.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {aiDrawData.draws?.map((draw: any, i: number) => (
                    <div key={i} className={`grid grid-cols-4 gap-2 text-sm p-3 rounded-lg border ${
                      latestApp?.ita_crs_score && draw.crs_cutoff <= latestApp.ita_crs_score ? "bg-green-50 border-green-200" : ""
                    }`}>
                      <span className="font-medium">{draw.date}</span>
                      <span>{draw.program}</span>
                      <span className="font-semibold">{draw.crs_cutoff}</span>
                      <span>{draw.invitations?.toLocaleString()}</span>
                    </div>
                  ))}
                  {aiDrawData.trends && (
                    <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                      <h4 className="font-medium text-sm">Trend Analysis</h4>
                      <p className="text-sm"><strong>CRS:</strong> {aiDrawData.trends.crs_trend}</p>
                      <p className="text-sm"><strong>Invitations:</strong> {aiDrawData.trends.invitation_trend}</p>
                      <p className="text-sm text-primary"><strong>Advice:</strong> {aiDrawData.trends.advice}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Processing Times */}
        <TabsContent value="processing">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Processing Times</CardTitle>
                  <CardDescription>Current IRCC processing time estimates.</CardDescription>
                </div>
                {!aiDrawData && (
                  <Button onClick={fetchAIAnalysis} disabled={loadingAI} size="sm">
                    {loadingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    Load Data
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!aiDrawData?.processingTimes ? (
                <p className="text-center py-8 text-muted-foreground">
                  {loadingAI ? "Loading..." : "Click \"Load Data\" to fetch processing times."}
                </p>
              ) : (
                <div className="space-y-3">
                  {aiDrawData.processingTimes.map((pt: any, i: number) => {
                    const isYours = latestApp && pt.program.toLowerCase().includes(latestApp.program);
                    return (
                      <div key={i} className={`p-4 rounded-lg border ${isYours ? "border-primary/30 bg-primary/5" : ""}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{pt.program}</span>
                            {isYours && <Badge variant="default">Your Program</Badge>}
                          </div>
                          <span className="text-lg font-semibold">{pt.estimated_months}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alternatives */}
        <TabsContent value="alternatives">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />Alternative Pathways</CardTitle>
                  <CardDescription>French streams, PNP, pilot programs, and other options.</CardDescription>
                </div>
                {!aiDrawData && (
                  <Button onClick={fetchAIAnalysis} disabled={loadingAI} size="sm">
                    {loadingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    Load Data
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!aiDrawData?.alternatives ? (
                <p className="text-center py-8 text-muted-foreground">
                  {loadingAI ? "Loading..." : "Click \"Load Data\" to see alternative pathways."}
                </p>
              ) : (
                <div className="space-y-4">
                  {aiDrawData.alternatives.map((alt: any, i: number) => (
                    <div key={i} className="p-4 rounded-lg border space-y-2">
                      <h4 className="font-semibold">{alt.pathway}</h4>
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
        </TabsContent>

        {/* Strategy */}
        <TabsContent value="strategy">
          <StrategySection hasApplied={hasApplied} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UpdateCard({ update }: { update: ImmigrationUpdate }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className={`cursor-pointer hover:border-primary/30 transition-colors ${
      update.urgency === "critical" ? "border-red-300 bg-red-50/30" :
      update.urgency === "high" ? "border-orange-200 bg-orange-50/30" : ""
    }`} onClick={() => setExpanded(!expanded)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`shrink-0 mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getUrgencyColor(update.urgency)}`}>
            {update.urgency}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-sm">{update.title}</h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getCategoryColor(update.category)}`}>
                {getCategoryLabel(update.category)}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted flex items-center gap-1">
                {update.is_official ? <Shield className="h-2.5 w-2.5" /> : null}
                {update.source_name}
              </span>
              {update.confidence_score < 90 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {update.confidence_score}% confidence
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{update.plain_language || update.summary}</p>

            {expanded && (
              <div className="mt-3 space-y-3 border-t pt-3">
                {update.summary !== update.plain_language && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Technical Summary</p>
                    <p className="text-sm">{update.summary}</p>
                  </div>
                )}
                {update.action_required && (
                  <div className="p-3 bg-primary/5 rounded-lg">
                    <p className="text-xs font-bold text-primary mb-1">What You Should Do</p>
                    <p className="text-sm">{update.action_required}</p>
                  </div>
                )}
                {update.affected_groups?.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">Affects:</span>
                    {update.affected_groups.map(g => (
                      <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-muted">{g.replace(/_/g, " ")}</span>
                    ))}
                  </div>
                )}
                {update.diff_snapshot && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-1">What Changed</p>
                    <p className="text-xs font-mono">{update.diff_snapshot}</p>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Detected: {update.detected_at ? new Date(update.detected_at).toLocaleString() : "Unknown"}</span>
                  {update.source_url && (
                    <a href={update.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                      View Source <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
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
  const daysSince = app.submission_date
    ? Math.floor((Date.now() - new Date(app.submission_date).getTime()) / (1000 * 60 * 60 * 24))
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
                Stage: {prStageLabel(app.current_stage)}
                {daysSince !== null && <span className="ml-2">· {daysSince} days waiting</span>}
              </p>
            </div>
          </div>
        </div>
        <div className="w-full bg-muted rounded-full h-3">
          <div className="bg-primary h-3 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MilestoneChip label="Biometrics" done={app.biometrics_done} />
          <MilestoneChip label="Medical" done={app.medical_passed} />
          <MilestoneChip label="Background" done={!!app.background_check_started} />
          <MilestoneChip label="Decision" done={app.current_stage === "approved" || app.current_stage === "refused"} />
        </div>
      </CardContent>
    </Card>
  );
}

function MilestoneChip({ label, done }: { label: string; done: boolean }) {
  return (
    <div className={`p-2 rounded-lg border text-center text-xs ${done ? "bg-green-50 border-green-200" : "bg-muted"}`}>
      <p className="font-medium">{label}</p>
      <p className={done ? "text-green-600" : "text-muted-foreground"}>{done ? "Done" : "Pending"}</p>
    </div>
  );
}

function StrategySection({ hasApplied }: { hasApplied: boolean }) {
  const tips = hasApplied ? [
    { title: "Monitor GCMS Notes", desc: "Order GCMS notes through ATIP to check progress. Takes 30+ days but gives detailed processing stage info." },
    { title: "Keep Documents Current", desc: "Ensure passport, police certificates, and medical remain valid. IRCC may request updated versions." },
    { title: "Report Changes Immediately", desc: "New job, address, family member, passport — report everything via the IRCC webform." },
    { title: "Maintain Legal Status", desc: "If your work permit expires before PR, apply for BOWP or extension before it expires." },
    { title: "Explore French Language", desc: "TEF/TCF scores add CRS points. Useful if you need to reapply or for future PNP." },
    { title: "Prepare for Landing", desc: "Gather proof of funds, address, employment letter. Be ready when COPR arrives." },
  ] : [
    { title: "Maximize CRS Score", desc: "Focus on CLB 9+, get French (TEF/TCF), and leverage Canadian work experience." },
    { title: "Provincial Nominee Programs", desc: "PNP adds 600 CRS points. Research OINP, BCPNP, SINP streams for your NOC." },
    { title: "French Language Advantage", desc: "French proficiency adds 50+ CRS points and qualifies for French-category draws." },
    { title: "Category-Based Draws", desc: "IRCC targets healthcare, STEM, trades, transport, agriculture. Check if your NOC qualifies." },
    { title: "Education Credential Assessment", desc: "Get foreign credentials assessed by WES/IQAS to unlock education CRS points." },
    { title: "Job Offer / LMIA", desc: "A valid job offer with LMIA adds 50-200 CRS points." },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          {hasApplied ? "While You Wait" : "PR Strategy Tips"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tips.map((tip, i) => (
          <div key={i} className="p-4 rounded-lg border hover:border-primary/30 transition-colors">
            <h4 className="font-medium mb-1">{tip.title}</h4>
            <p className="text-sm text-muted-foreground">{tip.desc}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
