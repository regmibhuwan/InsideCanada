"use client";

import { useState, useEffect } from "react";
import { useCase } from "@/lib/use-case";
import { prStageLabel, prProgramLabel } from "@/lib/utils";
import { getCategoryLabel, getCategoryColor, getUrgencyColor } from "@/lib/ircc-sources";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, Clock, AlertTriangle, Lightbulb, RefreshCw, FileCheck,
  ExternalLink, Shield, Newspaper, Filter, Zap, Target,
  ChevronDown, ChevronUp, Info, CheckCircle2, Link2
} from "lucide-react";

interface ScoredUpdate {
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
  relevanceScore: number;
  whyThisMatters: string;
  sourceFreshness: string;
  metadata?: {
    source_reliability?: string;
    province?: string;
    last_modified?: string;
    fetched_at?: string;
  };
}

export default function PRTrackerPage() {
  const { userCase, loading } = useCase();
  const [updates, setUpdates] = useState<ScoredUpdate[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("relevant");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [aiData, setAiData] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const hasApplied = userCase.profile?.has_applied_pr;
  const prApps = userCase.prApplications || [];
  const latestApp = prApps[0];
  const userProgram = latestApp?.program || userCase.profile?.pr_application_program || userCase.profile?.target_pr_stream || "";
  const userProvince = latestApp?.province_applied || userCase.profile?.current_province || "";

  useEffect(() => {
    if (!loading) {
      fetchFeed();
    }
  }, [loading]);

  async function fetchFeed() {
    setLoadingFeed(true);
    setFeedError(null);
    try {
      const res = await fetch("/api/immigration/user-impact");
      if (res.ok) {
        const data = await res.json();
        setUpdates(data.updates || []);
      } else {
        setFeedError("Could not load updates.");
      }
    } catch {
      setFeedError("Connection error.");
    }
    setLoadingFeed(false);
  }

  async function fetchAIAnalysis() {
    setLoadingAI(true);
    setAiError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 50000);
      const res = await fetch("/api/ai/pr-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          program: userProgram,
          noc_code: latestApp?.noc_code_applied || userCase.workHistory?.[0]?.noc_code || "",
          province: userProvince,
          crs_score: latestApp?.ita_crs_score || userCase.profile?.crs_score || null,
          has_applied: hasApplied,
          pnp_stream: latestApp?.pnp_stream || "",
        }),
      });
      clearTimeout(timeout);
      if (res.ok) {
        setAiData(await res.json());
      } else {
        setAiError("Could not load analysis.");
      }
    } catch {
      setAiError("Analysis timed out.");
    }
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
  const highRelevance = updates.filter(u => u.relevanceScore >= 40);
  const hasData = updates.length > 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">PR Tracker</h1>
          <p className="text-muted-foreground mt-1">
            Verified updates from official sources
            {userProvince && <span> · Prioritized for {userProvince}</span>}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchFeed} disabled={loadingFeed}>
          <RefreshCw className={`h-4 w-4 ${loadingFeed ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Application progress */}
      {hasApplied && latestApp && <ApplicationProgressCard app={latestApp} />}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full">
          <TabsTrigger value="relevant">
            <Target className="h-4 w-4 mr-1.5 hidden sm:inline" />For You{highRelevance.length > 0 && ` (${highRelevance.length})`}
          </TabsTrigger>
          <TabsTrigger value="all-updates">
            <Newspaper className="h-4 w-4 mr-1.5 hidden sm:inline" />All Updates
          </TabsTrigger>
          <TabsTrigger value="analysis">
            <Zap className="h-4 w-4 mr-1.5 hidden sm:inline" />AI Analysis
          </TabsTrigger>
          <TabsTrigger value="sources">
            <Link2 className="h-4 w-4 mr-1.5 hidden sm:inline" />Official Sources
          </TabsTrigger>
        </TabsList>

        {/* For You — relevance-scored */}
        <TabsContent value="relevant">
          <div className="space-y-4">
            {loadingFeed ? (
              <LoadingState />
            ) : feedError ? (
              <ErrorState message={feedError} onRetry={fetchFeed} />
            ) : !hasData ? (
              <EmptyState />
            ) : highRelevance.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Info className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <h3 className="font-semibold mb-1">No high-relevance updates right now</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    All ingested updates have low relevance to your profile. Check the &quot;All Updates&quot;
                    tab, or click AI Analysis for a personalized summary.
                  </p>
                </CardContent>
              </Card>
            ) : (
              highRelevance.map(update => (
                <VerifiedUpdateCard key={update.id} update={update} />
              ))
            )}
          </div>
        </TabsContent>

        {/* All Updates */}
        <TabsContent value="all-updates">
          <div className="space-y-4">
            {hasData && (
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <FilterButton label="All" active={filterCategory === "all"} onClick={() => setFilterCategory("all")} />
                {categories.map(cat => (
                  <FilterButton key={cat} label={getCategoryLabel(cat)} active={filterCategory === cat} onClick={() => setFilterCategory(cat)} />
                ))}
              </div>
            )}

            {loadingFeed ? (
              <LoadingState />
            ) : feedError ? (
              <ErrorState message={feedError} onRetry={fetchFeed} />
            ) : !hasData ? (
              <EmptyState />
            ) : filteredUpdates.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No updates in this category.
                </CardContent>
              </Card>
            ) : (
              filteredUpdates.map(update => (
                <VerifiedUpdateCard key={update.id} update={update} />
              ))
            )}
          </div>
        </TabsContent>

        {/* AI Analysis */}
        <TabsContent value="analysis">
          <div className="space-y-4">
            <Card className="border-amber-200 bg-amber-50/30">
              <CardContent className="p-4 flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800">
                  AI analysis only summarizes data from official sources already ingested. It does not invent
                  draw results, processing times, or eligibility rules. If data is missing, it will say so.
                </p>
              </CardContent>
            </Card>

            {!aiData && !loadingAI && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Zap className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <h3 className="font-semibold mb-2">AI-Powered Analysis</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                    Get a personalized summary of verified updates relevant to your stream,
                    province, and application status. Based only on ingested official data.
                  </p>
                  <Button onClick={fetchAIAnalysis}>
                    <Zap className="h-4 w-4 mr-1" /> Generate Analysis
                  </Button>
                </CardContent>
              </Card>
            )}

            {loadingAI && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
                  <p className="text-sm font-medium">Analyzing {updates.length} verified updates...</p>
                </CardContent>
              </Card>
            )}

            {aiError && (
              <ErrorState message={aiError} onRetry={fetchAIAnalysis} />
            )}

            {aiData && (
              <div className="space-y-4">
                {/* Stream status */}
                {aiData.yourStream && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Target className="h-5 w-5 text-primary" />
                        {aiData.yourStream.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{aiData.yourStream.currentStatus}</p>
                      {aiData.yourStream.sources?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {aiData.yourStream.sources.map((src: string, i: number) => (
                            <a key={i} href={src} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 hover:underline flex items-center gap-1">
                              <ExternalLink className="h-2.5 w-2.5" /> Source {i + 1}
                            </a>
                          ))}
                        </div>
                      )}
                      {!aiData.yourStream.dataAvailable && (
                        <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <p className="text-xs text-amber-800">No verified data ingested for this program yet. The data pipeline runs daily.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Relevant updates from AI */}
                {aiData.relevantUpdates?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Updates Relevant to You</CardTitle>
                      <CardDescription>Extracted from verified sources</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {aiData.relevantUpdates.map((u: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg border">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-sm">{u.title}</h4>
                            {u.is_official && (
                              <Badge variant="outline" className="text-[10px] shrink-0 border-green-300 text-green-700">
                                <Shield className="h-2.5 w-2.5 mr-0.5" />Official
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{u.summary}</p>
                          {u.whyRelevant && (
                            <p className="text-xs text-primary mt-2 font-medium">Why this matters: {u.whyRelevant}</p>
                          )}
                          {u.source_url && (
                            <a href={u.source_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-2">
                              <ExternalLink className="h-3 w-3" /> {u.source_name || "View source"}
                            </a>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Processing times */}
                {aiData.processingTimes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Clock className="h-5 w-5" /> Processing Times
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{aiData.processingTimes.note}</p>
                      {aiData.processingTimes.source_url && (
                        <a href={aiData.processingTimes.source_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-2">
                          <ExternalLink className="h-3 w-3" /> Check official processing times
                        </a>
                      )}
                      {!aiData.processingTimes.available && (
                        <a href="https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html"
                          target="_blank" rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <ExternalLink className="h-3 w-3" /> Check IRCC processing times directly
                        </a>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Advice */}
                {aiData.advice && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Lightbulb className="h-5 w-5" /> Personalized Guidance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{aiData.advice.text}</p>
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <p className="text-[11px] text-muted-foreground">
                          {aiData.advice.disclaimer}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Based on: {aiData.advice.basedOn === "fetched_data" ? "Verified ingested data" : "General immigration knowledge"}
                          {aiData._meta && ` · ${aiData._meta.updatesInDatabase} updates in database`}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Official Sources */}
        <TabsContent value="sources">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-5 w-5" /> Official Sources
              </CardTitle>
              <CardDescription>
                These are the official pages our system monitors. Always verify information directly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <SourceGroup title="Federal IRCC" sources={[
                  { name: "IRCC Notices", url: "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices.html" },
                  { name: "IRCC News Releases", url: "https://www.canada.ca/en/immigration-refugees-citizenship/news/news-releases.html" },
                  { name: "Processing Times", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html" },
                  { name: "Express Entry", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html" },
                  { name: "Provincial Nominees", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees.html" },
                  { name: "PGWP", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/post-graduation-work-permit.html" },
                ]} />
                <SourceGroup title="Atlantic" sources={[
                  { name: "Atlantic Immigration Program", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html" },
                ]} />
                <SourceGroup title="Provincial Programs" sources={[
                  { name: "Nova Scotia Immigration", url: "https://novascotiaimmigration.com/" },
                  { name: "Ontario (OINP)", url: "https://www.ontario.ca/page/ontario-immigrant-nominee-program-oinp" },
                  { name: "British Columbia (BC PNP)", url: "https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program" },
                  { name: "Alberta (AAIP)", url: "https://www.alberta.ca/alberta-advantage-immigration-program" },
                  { name: "Saskatchewan (SINP)", url: "https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program" },
                  { name: "Manitoba (MPNP)", url: "https://immigratemanitoba.com/immigrate-to-manitoba/" },
                ]} />
                <SourceGroup title="Eligibility" sources={[
                  { name: "CEC Eligibility", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/canadian-experience-class.html" },
                  { name: "FSW Eligibility", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/federal-skilled-workers.html" },
                  { name: "Language Requirements", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/become-candidate/eligibility/language-requirements.html" },
                ]} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SourceGroup({ title, sources }: { title: string; sources: { name: string; url: string }[] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sources.map(s => (
          <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 p-2.5 rounded-lg border hover:border-primary/30 hover:bg-primary/5 transition-colors text-sm">
            <Shield className="h-3.5 w-3.5 text-green-600 shrink-0" />
            <span className="flex-1">{s.name}</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}

function VerifiedUpdateCard({ update }: { update: ScoredUpdate }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className={`cursor-pointer hover:border-primary/20 transition-colors ${
      update.urgency === "critical" ? "border-red-300 bg-red-50/30" :
      update.urgency === "high" ? "border-orange-200 bg-orange-50/30" :
      update.relevanceScore >= 60 ? "border-primary/20 bg-primary/5" : ""
    }`} onClick={() => setExpanded(!expanded)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getUrgencyColor(update.urgency)}`}>
              {update.urgency}
            </div>
            {update.relevanceScore > 0 && (
              <span className="text-[10px] text-muted-foreground">{update.relevanceScore}%</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm">{update.title}</h3>
              {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1.5 flex-wrap mt-1.5 mb-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getCategoryColor(update.category)}`}>
                {getCategoryLabel(update.category)}
              </span>
              {update.is_official ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-800 flex items-center gap-0.5">
                  <Shield className="h-2.5 w-2.5" /> Official
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Secondary
                </span>
              )}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">
                {update.sourceFreshness}
              </span>
              {update.confidence_score < 90 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {update.confidence_score}% confidence
                </span>
              )}
            </div>

            <p className="text-sm text-muted-foreground">{update.plain_language || update.summary}</p>

            {/* Why this matters */}
            {update.whyThisMatters && update.relevanceScore >= 20 && (
              <p className="text-xs text-primary mt-2 font-medium flex items-center gap-1">
                <Target className="h-3 w-3 shrink-0" />
                {update.whyThisMatters}
              </p>
            )}

            {/* Source link always visible */}
            <div className="flex items-center justify-between mt-2">
              {update.source_url && (
                <a href={update.source_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  onClick={e => e.stopPropagation()}>
                  <ExternalLink className="h-3 w-3" /> {update.source_name}
                </a>
              )}
            </div>

            {/* Expanded details */}
            {expanded && (
              <div className="mt-3 space-y-3 border-t pt-3">
                {update.summary !== update.plain_language && update.summary && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Full Summary</p>
                    <p className="text-sm">{update.summary}</p>
                  </div>
                )}
                {update.action_required && (
                  <div className="p-3 bg-primary/5 rounded-lg">
                    <p className="text-xs font-bold text-primary mb-1">Recommended Action</p>
                    <p className="text-sm">{update.action_required}</p>
                  </div>
                )}
                {update.diff_snapshot && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-1">What Changed</p>
                    <p className="text-xs">{update.diff_snapshot}</p>
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
                <div className="text-[11px] text-muted-foreground space-y-0.5">
                  <p>Detected: {update.detected_at ? new Date(update.detected_at).toLocaleString() : "Unknown"}</p>
                  {update.metadata?.last_modified && <p>Source last modified: {update.metadata.last_modified}</p>}
                  {update.metadata?.fetched_at && <p>Last fetched: {new Date(update.metadata.fetched_at).toLocaleString()}</p>}
                  <p>Reliability: {update.metadata?.source_reliability === "official" ? "Official IRCC" : update.metadata?.source_reliability === "official_provincial" ? "Official Provincial" : "Secondary"}</p>
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
          {[
            { label: "Biometrics", done: app.biometrics_done },
            { label: "Medical", done: app.medical_passed },
            { label: "Background", done: !!app.background_check_started },
            { label: "Decision", done: app.current_stage === "approved" || app.current_stage === "refused" },
          ].map(m => (
            <div key={m.label} className={`p-2 rounded-lg border text-center text-xs ${m.done ? "bg-green-50 border-green-200" : "bg-muted"}`}>
              <p className="font-medium">{m.label}</p>
              <p className={m.done ? "text-green-600" : "text-muted-foreground"}>{m.done ? "Done" : "Pending"}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center py-12 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin mb-3" />
      <p className="text-sm">Loading verified updates...</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center py-12">
        <AlertTriangle className="h-8 w-8 text-amber-500 mb-3" />
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-1" /> Try Again
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center py-12">
        <Newspaper className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
        <h3 className="font-semibold mb-1">No verified updates yet</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
          The data pipeline monitors official IRCC and provincial sources daily. Updates will appear
          here once changes are detected. In the meantime, check the &quot;Official Sources&quot; tab for direct links.
        </p>
        <a href="https://www.canada.ca/en/immigration-refugees-citizenship/news/notices.html"
          target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-1" /> Check IRCC Directly
          </Button>
        </a>
      </CardContent>
    </Card>
  );
}

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full transition-colors ${active ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"}`}
    >{label}</button>
  );
}
