"use client";

import { useState, useEffect } from "react";
import { useCase } from "@/lib/use-case";
import { prStageLabel, prProgramLabel } from "@/lib/utils";
import { getCategoryLabel, getCategoryColor, getUrgencyColor, PROVINCES_WITH_PNP } from "@/lib/ircc-sources";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, TrendingUp, Clock, Globe, Target,
  AlertTriangle, Lightbulb, RefreshCw, FileCheck,
  ExternalLink, Shield, Newspaper, Filter, Zap, MapPin,
  ArrowUpRight, ArrowDownRight, Minus, ChevronDown, ChevronUp
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
  const [activeTab, setActiveTab] = useState("your-stream");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [aiData, setAiData] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const hasApplied = userCase.profile?.has_applied_pr;
  const prApps = userCase.prApplications || [];
  const latestApp = prApps[0];

  const userProgram = latestApp?.program || userCase.profile?.pr_application_program || userCase.profile?.target_pr_stream || "cec";
  const userProvince = latestApp?.province_applied || userCase.profile?.current_province || "";
  const userPnpStream = latestApp?.pnp_stream || "";
  const userStreamLabel = getStreamLabel(userProgram, userPnpStream, userProvince);

  useEffect(() => {
    if (!loading) {
      fetchFeed();
      fetchAlerts();
      fetchAIAnalysis();
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
          pnp_stream: userPnpStream,
        }),
      });

      clearTimeout(timeout);

      if (res.ok) {
        setAiData(await res.json());
      } else {
        setAiError("Could not load analysis. Try refreshing.");
      }
    } catch {
      setAiError("Analysis timed out. Try again.");
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">PR Tracker</h1>
          <p className="text-muted-foreground mt-1">
            Tracking <span className="font-medium text-foreground">{userStreamLabel}</span>
            {userProvince && <span> · {userProvince}</span>}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchFeed(); fetchAIAnalysis(); }} disabled={loadingFeed || loadingAI}>
          <RefreshCw className={`h-4 w-4 ${loadingFeed || loadingAI ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Critical alerts */}
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

      {/* Application progress */}
      {hasApplied && latestApp && <ApplicationProgressCard app={latestApp} />}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full">
          <TabsTrigger value="your-stream"><Target className="h-4 w-4 mr-1.5 hidden sm:inline" />Your Stream</TabsTrigger>
          <TabsTrigger value="processing"><Clock className="h-4 w-4 mr-1.5 hidden sm:inline" />Processing</TabsTrigger>
          <TabsTrigger value="provinces"><MapPin className="h-4 w-4 mr-1.5 hidden sm:inline" />All Provinces</TabsTrigger>
          <TabsTrigger value="feed"><Newspaper className="h-4 w-4 mr-1.5 hidden sm:inline" />Live Feed</TabsTrigger>
          <TabsTrigger value="strategy"><Lightbulb className="h-4 w-4 mr-1.5 hidden sm:inline" />Strategy</TabsTrigger>
        </TabsList>

        {/* Your Stream — personalized tab */}
        <TabsContent value="your-stream">
          <div className="space-y-4">
            {loadingAI ? (
              <Card>
                <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-3" />
                  <p className="text-sm font-medium">Analyzing {userStreamLabel}...</p>
                  <p className="text-xs mt-1">Fetching latest 2026 data for your program</p>
                </CardContent>
              </Card>
            ) : aiError ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12">
                  <AlertTriangle className="h-8 w-8 text-amber-500 mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">{aiError}</p>
                  <Button variant="outline" size="sm" onClick={fetchAIAnalysis}>
                    <RefreshCw className="h-4 w-4 mr-1" /> Try Again
                  </Button>
                </CardContent>
              </Card>
            ) : aiData?.yourStream ? (
              <>
                {/* Your stream overview */}
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      {aiData.yourStream.name}
                    </CardTitle>
                    <CardDescription>{aiData.yourStream.currentStatus}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-background border">
                        <p className="text-xs text-muted-foreground font-medium mb-1">Processing Time</p>
                        <p className="text-lg font-bold">{aiData.yourStream.processingTime}</p>
                      </div>
                      {hasApplied && latestApp?.submission_date && (
                        <div className="p-4 rounded-lg bg-background border">
                          <p className="text-xs text-muted-foreground font-medium mb-1">Your Wait So Far</p>
                          <p className="text-lg font-bold">
                            {Math.floor((Date.now() - new Date(latestApp.submission_date).getTime()) / (1000 * 60 * 60 * 24))} days
                          </p>
                        </div>
                      )}
                    </div>

                    {aiData.yourStream.recentChanges?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Recent Changes (2025-2026)</h4>
                        <ul className="space-y-2">
                          {aiData.yourStream.recentChanges.map((change: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="text-primary mt-1 shrink-0">•</span>
                              <span>{change}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {aiData.yourStream.tips?.length > 0 && (
                      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                        <h4 className="text-sm font-semibold mb-2 text-amber-900">Tips for Your Program</h4>
                        <ul className="space-y-1.5">
                          {aiData.yourStream.tips.map((tip: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                              <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Trends */}
                {aiData.trends && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingUp className="h-5 w-5" />
                        2026 Immigration Landscape
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="p-3 rounded-lg border">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Overall Trends</p>
                        <p className="text-sm">{aiData.trends.overall}</p>
                      </div>
                      <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                        <p className="text-xs font-medium text-primary mb-1">Your Stream Trend</p>
                        <p className="text-sm">{aiData.trends.userStreamTrend}</p>
                      </div>
                      <div className="p-3 rounded-lg border border-green-200 bg-green-50">
                        <p className="text-xs font-medium text-green-800 mb-1">Personalized Advice</p>
                        <p className="text-sm text-green-900">{aiData.trends.advice}</p>
                      </div>
                      {aiData.trends.risks && (
                        <div className="p-3 rounded-lg border border-amber-200 bg-amber-50">
                          <p className="text-xs font-medium text-amber-800 mb-1">Risks to Watch</p>
                          <p className="text-sm text-amber-900">{aiData.trends.risks}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Draws relevant to user */}
                {aiData.draws?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Recent Draws & Intakes</CardTitle>
                      <CardDescription>Federal and provincial rounds relevant to you</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {aiData.draws.map((draw: any, i: number) => (
                          <div key={i} className={`p-3 rounded-lg border text-sm ${draw.relevantToUser ? "border-primary/30 bg-primary/5" : ""}`}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{draw.date}</span>
                                <Badge variant={draw.relevantToUser ? "default" : "secondary"} className="text-[10px]">
                                  {draw.type?.replace(/_/g, " ") || draw.program}
                                </Badge>
                                {draw.relevantToUser && <Badge variant="outline" className="text-[10px] border-primary text-primary">Relevant</Badge>}
                              </div>
                            </div>
                            <p className="text-muted-foreground">{draw.details}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Alternatives */}
                {aiData.alternatives?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Globe className="h-5 w-5" />
                        Alternative Pathways
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {aiData.alternatives.map((alt: any, i: number) => (
                        <div key={i} className="p-4 rounded-lg border hover:border-primary/30 transition-colors">
                          <h4 className="font-semibold text-sm">{alt.pathway}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{alt.description}</p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="text-xs text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded-full">{alt.advantage}</span>
                            {alt.processingTime && (
                              <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                                <Clock className="h-3 w-3 inline mr-0.5" />{alt.processingTime}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">{alt.eligibility_hint}</span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center py-12">
                  <Target className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
                  <h3 className="font-semibold mb-1">No analysis loaded</h3>
                  <p className="text-sm text-muted-foreground mb-4">Click below to get AI analysis for your stream.</p>
                  <Button onClick={fetchAIAnalysis} disabled={loadingAI}>
                    <Zap className="h-4 w-4 mr-1" /> Load Analysis
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Processing Times */}
        <TabsContent value="processing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Processing Times (2026)</CardTitle>
              <CardDescription>Current IRCC and provincial processing estimates — updated with latest data.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAI ? (
                <div className="flex flex-col items-center py-12 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-3" />
                  <p className="text-sm">Loading current processing times...</p>
                </div>
              ) : !aiData?.processingTimes ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Processing time data not yet loaded.</p>
                  <Button onClick={fetchAIAnalysis} disabled={loadingAI} size="sm">
                    <Zap className="h-4 w-4 mr-1" /> Load Data
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {aiData.processingTimes.map((pt: any, i: number) => {
                    const isYours = isUserProgram(pt.program, userProgram, userProvince);
                    const TrendIcon = pt.trend === "increasing" ? ArrowUpRight :
                                      pt.trend === "decreasing" ? ArrowDownRight : Minus;
                    const trendColor = pt.trend === "increasing" ? "text-red-500" :
                                       pt.trend === "decreasing" ? "text-green-500" : "text-gray-400";
                    return (
                      <div key={i} className={`p-4 rounded-lg border ${isYours ? "border-primary/30 bg-primary/5 ring-1 ring-primary/20" : ""}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="font-medium text-sm">{pt.program}</span>
                            {isYours && <Badge variant="default" className="text-[10px] shrink-0">Your Program</Badge>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                            <span className="text-base font-bold">{pt.estimated_months}</span>
                          </div>
                        </div>
                        {pt.notes && <p className="text-xs text-muted-foreground mt-1">{pt.notes}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Provinces */}
        <TabsContent value="provinces">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Provincial Nominee Programs (2026)
                </CardTitle>
                <CardDescription>Latest PNP updates across all provinces. Your province is highlighted.</CardDescription>
              </CardHeader>
            </Card>

            {loadingAI ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-3" />
                  <p className="text-sm">Loading provincial data...</p>
                </CardContent>
              </Card>
            ) : !aiData?.provincialUpdates ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Provincial data not yet loaded.</p>
                  <Button onClick={fetchAIAnalysis} disabled={loadingAI} size="sm">
                    <Zap className="h-4 w-4 mr-1" /> Load Data
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {aiData.provincialUpdates
                  .sort((a: any, b: any) => (b.isRelevant ? 1 : 0) - (a.isRelevant ? 1 : 0))
                  .map((prov: any, i: number) => (
                    <ProvinceCard key={i} province={prov} isRelevant={prov.isRelevant} />
                  ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Live Feed */}
        <TabsContent value="feed">
          <div className="space-y-4">
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
                    The system checks IRCC, provincial PNP sites, and AIP pages daily.
                    Check the &quot;Your Stream&quot; tab for AI-powered analysis.
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

        {/* Strategy */}
        <TabsContent value="strategy">
          <StrategySection
            hasApplied={hasApplied}
            program={userProgram}
            province={userProvince}
            streamLabel={userStreamLabel}
            aiData={aiData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProvinceCard({ province, isRelevant }: { province: any; isRelevant: boolean }) {
  const [expanded, setExpanded] = useState(isRelevant);

  return (
    <Card className={`cursor-pointer transition-colors ${isRelevant ? "border-primary/30 bg-primary/5 ring-1 ring-primary/20" : "hover:border-muted-foreground/30"}`}
      onClick={() => setExpanded(!expanded)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className={`h-4 w-4 ${isRelevant ? "text-primary" : "text-muted-foreground"}`} />
            <h3 className="font-semibold text-sm">{province.province}</h3>
            <Badge variant="secondary" className="text-[10px]">{province.program}</Badge>
            {isRelevant && <Badge variant="default" className="text-[10px]">Your Province</Badge>}
          </div>
          <div className="flex items-center gap-2">
            {province.processingTime && (
              <span className="text-xs text-muted-foreground"><Clock className="h-3 w-3 inline mr-0.5" />{province.processingTime}</span>
            )}
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
        {expanded && (
          <div className="mt-3 space-y-2 border-t pt-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Latest Update</p>
              <p className="text-sm">{province.latestUpdate}</p>
            </div>
            {province.nextDraw && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Next Draw / Intake</p>
                <p className="text-sm">{province.nextDraw}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
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
            <h3 className="font-semibold text-sm mb-1">{update.title}</h3>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getCategoryColor(update.category)}`}>
                {getCategoryLabel(update.category)}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted flex items-center gap-1">
                {update.is_official ? <Shield className="h-2.5 w-2.5" /> : null}
                {update.source_name}
              </span>
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
                    <a href={update.source_url} target="_blank" rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                      onClick={e => e.stopPropagation()}>
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

function StrategySection({ hasApplied, program, province, streamLabel, aiData }: {
  hasApplied: boolean;
  program: string;
  province: string;
  streamLabel: string;
  aiData: any;
}) {
  const isPNP = ["pnp", "pnp_ee", "nsnp", "oinp", "bcpnp", "sinp", "mpnp"].includes(program);
  const isAIP = program === "atlantic" || program === "aipp";

  const appliedTips = [
    { title: "Order GCMS Notes", desc: "Order through ATIP to see exactly where your file is in processing. Takes 30+ days but gives real insight into what stage IRCC is at." },
    { title: "Keep ALL Documents Current", desc: "Passport, police certificates, medical exam, language test — if anything expires during processing, you may need to redo it. Check expiry dates now." },
    { title: "Report Changes Immediately", desc: "New job, address change, new family member, new passport — report everything via the IRCC webform. Failure to report can delay or refuse your application." },
    { title: "Maintain Legal Status", desc: "If your work permit expires before PR decision, apply for a BOWP (Bridging Open Work Permit) or work permit extension BEFORE it expires." },
    ...(isPNP ? [
      { title: "Stay in the Province", desc: `Most PNP programs require you to live and work in ${province || "the nominating province"}. Leaving could jeopardize your nomination.` },
      { title: "Provincial Reporting", desc: "Some provinces require periodic updates during federal processing. Check your nomination conditions." },
    ] : []),
    ...(isAIP ? [
      { title: "AIP Processing Reality", desc: "AIP has been taking 36-40+ months as of 2026. This is significantly longer than advertised. Stay patient and keep your employer designation active." },
      { title: "Employer Designation", desc: "Ensure your designated employer maintains their designation. If they lose it, it can affect your application." },
      { title: "Settlement Plan", desc: "Keep your settlement plan organization engaged. They may need to provide updates to IRCC." },
    ] : []),
  ];

  const notAppliedTips = [
    ...(isPNP ? [
      { title: `${province || "Provincial"} PNP Streams`, desc: `Research all available streams in ${province || "your target province"}. Each has different criteria — some don't require a job offer, some target specific NOCs.` },
      { title: "PNP + Express Entry", desc: "A provincial nomination adds 600 CRS points to your Express Entry profile, virtually guaranteeing an ITA. Apply to PNP-EE streams if eligible." },
    ] : []),
    { title: "Maximize Language Scores", desc: "CLB 9+ in all four skills makes a massive difference. Retake IELTS/CELPIP if you're close. Consider TEF/TCF for additional French points." },
    { title: "Category-Based Draws", desc: "IRCC runs category-based draws targeting healthcare, STEM, trades, transport, agriculture, and French speakers. Check if your NOC qualifies." },
    { title: "French Language Advantage", desc: "Even basic French (TEF/TCF) adds 25-50+ CRS points and qualifies you for French-priority draws and Francophone streams." },
    { title: "Multiple PNP Applications", desc: "You can apply to multiple provinces simultaneously. Consider SINP, MPNP, AAIP, and Atlantic programs alongside your primary target." },
    ...(isAIP ? [
      { title: "Find a Designated Employer", desc: "AIP requires a job offer from a designated Atlantic employer. Search the IRCC employer designation list for your NOC." },
      { title: "AIP Wait Times", desc: "Be aware that AIP processing has increased to 36-40+ months in 2026. Factor this into your planning." },
    ] : []),
  ];

  const tips = hasApplied ? appliedTips : notAppliedTips;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          {hasApplied ? `While You Wait — ${streamLabel}` : `Strategy for ${streamLabel}`}
        </CardTitle>
        <CardDescription>
          {hasApplied
            ? "Practical tips to protect your application while processing"
            : "Steps to strengthen your application and maximize chances"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {tips.map((tip, i) => (
          <div key={i} className="p-4 rounded-lg border hover:border-primary/30 transition-colors">
            <h4 className="font-medium text-sm mb-1">{tip.title}</h4>
            <p className="text-sm text-muted-foreground">{tip.desc}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function getStreamLabel(program: string, pnpStream?: string, province?: string): string {
  const labels: Record<string, string> = {
    cec: "Canadian Experience Class (CEC)",
    fsw: "Federal Skilled Worker (FSW)",
    fst: "Federal Skilled Trades (FST)",
    pnp: `PNP${province ? ` — ${province}` : ""}${pnpStream ? ` (${pnpStream})` : ""}`,
    pnp_ee: `PNP Express Entry${province ? ` — ${province}` : ""}${pnpStream ? ` (${pnpStream})` : ""}`,
    nsnp: `Nova Scotia (NSNP)${pnpStream ? ` — ${pnpStream}` : ""}`,
    atlantic: "Atlantic Immigration Program (AIP)",
    aipp: "Atlantic Immigration Program (AIP)",
    sponsorship: "Family Sponsorship",
    rural: "Rural & Northern Immigration Pilot",
    other: "Immigration Program",
  };
  return labels[program] || program;
}

function isUserProgram(ptProgram: string, userProgram: string, userProvince: string): boolean {
  const pt = ptProgram.toLowerCase();
  const up = userProgram.toLowerCase();

  if (up === "pnp" || up === "pnp_ee") {
    if (userProvince) return pt.includes(userProvince.toLowerCase()) || pt.includes("pnp");
    return pt.includes("pnp");
  }
  if (up === "atlantic" || up === "aipp") return pt.includes("atlantic") || pt.includes("aip");
  if (up === "nsnp") return pt.includes("nova scotia") || pt.includes("nsnp");
  if (up === "cec") return pt.includes("cec") || pt.includes("canadian experience");
  if (up === "fsw") return pt.includes("fsw") || pt.includes("federal skilled worker");
  return pt.includes(up);
}
