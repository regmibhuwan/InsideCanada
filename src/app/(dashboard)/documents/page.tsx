"use client";

import { useState, useEffect } from "react";
import { useCase } from "@/lib/use-case";
import { createClient } from "@/lib/supabase/client";
import {
  STREAM_GROUPS,
  APPLICATION_STAGES,
  getChecklistForStream,
  getRecommendedChecklist,
  type ApplicationStage,
} from "@/lib/document-checklists";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2, Circle, Shield, Loader2, AlertTriangle,
  FileCheck, Info, ChevronDown, ChevronUp, Zap,
  MessageSquare, ArrowRight, XCircle, AlertCircle, Sparkles,
} from "lucide-react";

interface ReadinessItem {
  id: string;
  document_key: string;
  has_document: boolean;
  notes: string | null;
  stream: string;
}

interface SingleReview {
  verdict: string;
  reason: string;
  fix: string | null;
  priority: string;
}

interface BulkReviewDoc {
  key: string;
  label: string;
  verdict: string;
  note: string;
  fix: string | null;
}

interface BulkReview {
  overallVerdict: string;
  overallSummary: string;
  readinessPercent: number;
  documents: BulkReviewDoc[];
  criticalIssues: string[];
  nextAction: string;
}

export default function DocumentsPage() {
  const { userCase, loading } = useCase();
  const [selectedStream, setSelectedStream] = useState<string>("");
  const [applicationStage, setApplicationStage] = useState<ApplicationStage>("pre_application");
  const [readiness, setReadiness] = useState<ReadinessItem[]>([]);
  const [loadingReadiness, setLoadingReadiness] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("checklist");

  // AI Review state
  const [reviewingDoc, setReviewingDoc] = useState<string | null>(null);
  const [reviewDetails, setReviewDetails] = useState<string>("");
  const [singleReview, setSingleReview] = useState<SingleReview | null>(null);
  const [loadingSingleReview, setLoadingSingleReview] = useState(false);
  const [bulkReview, setBulkReview] = useState<BulkReview | null>(null);
  const [loadingBulkReview, setLoadingBulkReview] = useState(false);

  useEffect(() => {
    if (!loading && userCase.profile) {
      const profileStream = userCase.profile.target_pr_stream ||
        userCase.profile.pr_application_program || "";

      if (userCase.profile.has_applied_pr) {
        setApplicationStage("federal_applied");
      }

      const matchedStream = STREAM_GROUPS
        .flatMap(g => g.streams)
        .find(s => s.stream === profileStream);

      if (matchedStream) {
        setSelectedStream(matchedStream.stream);
      } else if (profileStream.includes("pnp") || profileStream.includes("nsnp")) {
        setSelectedStream("pnp_ns_provincial");
      } else if (profileStream === "cec" || profileStream === "fsw" || profileStream === "fst") {
        setSelectedStream(profileStream);
      } else {
        setSelectedStream("cec");
      }
    }
  }, [loading, userCase.profile]);

  useEffect(() => {
    if (selectedStream && userCase.profile) {
      const recommended = getRecommendedChecklist(selectedStream, applicationStage);
      if (recommended !== selectedStream) {
        setSelectedStream(recommended);
      }
      fetchReadiness();
    }
  }, [selectedStream, userCase.profile]);

  async function fetchReadiness() {
    setLoadingReadiness(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("document_readiness")
        .select("*")
        .eq("user_id", userCase.profile.id)
        .eq("stream", selectedStream);
      setReadiness((data || []) as ReadinessItem[]);
    } catch {
      setReadiness([]);
    }
    setLoadingReadiness(false);
  }

  async function toggleDocument(documentKey: string, currentlyHas: boolean) {
    setSaving(documentKey);
    const supabase = createClient();

    const existing = readiness.find(r => r.document_key === documentKey);
    if (existing) {
      await supabase
        .from("document_readiness")
        .update({ has_document: !currentlyHas, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("document_readiness").insert({
        user_id: userCase.profile.id,
        stream: selectedStream,
        document_key: documentKey,
        has_document: true,
      });
    }

    await fetchReadiness();
    setSaving(null);
  }

  async function runSingleReview(docKey: string) {
    setLoadingSingleReview(true);
    setSingleReview(null);
    try {
      const readinessMap = new Map(readiness.map(r => [r.document_key, { has: r.has_document, notes: r.notes }]));
      const checklistStatus: Record<string, { has: boolean; notes?: string }> = {};
      checklist?.items.forEach(item => {
        const r = readinessMap.get(item.key);
        checklistStatus[item.key] = { has: r?.has || false, notes: r?.notes || undefined };
      });

      const res = await fetch("/api/ai/document-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "single",
          stream: selectedStream,
          stage: checklist?.stage || "single",
          checklist_status: checklistStatus,
          document_key: docKey,
          document_details: reviewDetails,
        }),
      });

      if (res.ok) {
        setSingleReview(await res.json());
      }
    } catch { /* silent */ }
    setLoadingSingleReview(false);
  }

  async function runBulkReview() {
    setLoadingBulkReview(true);
    setBulkReview(null);
    try {
      const readinessMap = new Map(readiness.map(r => [r.document_key, { has: r.has_document, notes: r.notes }]));
      const checklistStatus: Record<string, { has: boolean; notes?: string }> = {};
      checklist?.items.forEach(item => {
        const r = readinessMap.get(item.key);
        checklistStatus[item.key] = { has: r?.has || false, notes: r?.notes || undefined };
      });

      const res = await fetch("/api/ai/document-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "bulk",
          stream: selectedStream,
          stage: checklist?.stage || "single",
          checklist_status: checklistStatus,
        }),
      });

      if (res.ok) {
        setBulkReview(await res.json());
      }
    } catch { /* silent */ }
    setLoadingBulkReview(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const checklist = getChecklistForStream(selectedStream);
  const readinessMap = new Map(readiness.map(r => [r.document_key, r.has_document]));
  const totalRequired = checklist?.items.filter(i => i.required).length || 0;
  const completedRequired = checklist?.items.filter(i => i.required && readinessMap.get(i.key)).length || 0;
  const progressPercent = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0;
  const isReady = completedRequired === totalRequired && totalRequired > 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Document Readiness</h1>
        <p className="text-muted-foreground mt-1">
          Select your stream and stage, then check off documents you have. Use AI review for feedback.
        </p>
      </div>

      {/* Stream + Stage Selector */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Immigration Stream</label>
              <Select value={selectedStream} onValueChange={(v) => { setSelectedStream(v); setBulkReview(null); setSingleReview(null); }}>
                <SelectTrigger><SelectValue placeholder="Select stream" /></SelectTrigger>
                <SelectContent className="max-h-80">
                  {STREAM_GROUPS.map(group => (
                    <SelectGroup key={group.groupLabel}>
                      <SelectLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {group.groupLabel}
                      </SelectLabel>
                      {group.streams.map(s => (
                        <SelectItem key={s.stream} value={s.stream}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Application Stage</label>
              <Select value={applicationStage} onValueChange={(v) => { setApplicationStage(v as ApplicationStage); setBulkReview(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPLICATION_STAGES.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      <div>
                        <span>{s.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{s.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stage guidance */}
          {checklist?.stage === "provincial" && applicationStage === "nominated" && (
            <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">You have your nomination!</p>
                <p className="text-xs text-green-700">
                  Switch to the federal PR stage checklist for your province to see what you need for the federal application.
                </p>
                <Button size="sm" variant="outline" className="mt-2 text-xs h-7"
                  onClick={() => setSelectedStream(selectedStream.replace("_provincial", "_federal"))}>
                  Switch to Federal Stage <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Progress summary */}
          <div className="flex items-center gap-4 pt-2">
            <div className="flex-1">
              <Progress value={progressPercent} className="h-3" />
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold">{progressPercent}%</p>
              <p className="text-xs text-muted-foreground">{completedRequired}/{totalRequired} required</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Checklist / AI Review */}
      {checklist && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="checklist">
              <FileCheck className="h-4 w-4 mr-1.5" /> Checklist
            </TabsTrigger>
            <TabsTrigger value="ai-review">
              <Sparkles className="h-4 w-4 mr-1.5" /> AI Review
            </TabsTrigger>
          </TabsList>

          {/* Checklist Tab */}
          <TabsContent value="checklist" className="space-y-4 mt-4">
            <Card className={isReady ? "border-green-300 bg-green-50/50" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {isReady ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold">
                      {isReady ? "All required documents confirmed!" : `${totalRequired - completedRequired} required documents remaining`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isReady
                        ? "Double-check that all documents are current, valid, and correctly formatted."
                        : "Check off each document as you gather them. Use AI Review for feedback."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  {checklist.label}
                </CardTitle>
                <CardDescription>{checklist.description}</CardDescription>
                {checklist.stage !== "single" && (
                  <Badge variant="outline" className="w-fit mt-1">
                    {checklist.stage === "provincial" ? "Provincial Stage" : "Federal Stage"}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingReadiness ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-2 pb-1">
                      Required Documents
                    </p>
                    {checklist.items.filter(i => i.required).map(item => (
                      <DocumentCheckItem
                        key={item.key}
                        item={item}
                        checked={readinessMap.get(item.key) || false}
                        saving={saving === item.key}
                        onToggle={() => toggleDocument(item.key, readinessMap.get(item.key) || false)}
                        onReview={() => { setReviewingDoc(item.key); setReviewDetails(""); setSingleReview(null); setActiveTab("ai-review"); }}
                      />
                    ))}

                    {checklist.items.some(i => !i.required) && (
                      <>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-4 pb-1">
                          Optional (Recommended)
                        </p>
                        {checklist.items.filter(i => !i.required).map(item => (
                          <DocumentCheckItem
                            key={item.key}
                            item={item}
                            checked={readinessMap.get(item.key) || false}
                            saving={saving === item.key}
                            onToggle={() => toggleDocument(item.key, readinessMap.get(item.key) || false)}
                            onReview={() => { setReviewingDoc(item.key); setReviewDetails(""); setSingleReview(null); setActiveTab("ai-review"); }}
                          />
                        ))}
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Review Tab */}
          <TabsContent value="ai-review" className="space-y-4 mt-4">
            {/* Bulk Review */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" /> Full Package Review
                </CardTitle>
                <CardDescription>
                  AI reviews your entire application package based on your checklist status. Blunt, honest, practical.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={runBulkReview} disabled={loadingBulkReview} className="w-full sm:w-auto">
                  {loadingBulkReview ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Analyzing...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" /> Review Full Package</>
                  )}
                </Button>

                {bulkReview && (
                  <div className="mt-4 space-y-4">
                    {/* Overall verdict */}
                    <div className={`p-4 rounded-lg border-2 ${
                      bulkReview.overallVerdict === "READY" ? "border-green-300 bg-green-50" :
                      bulkReview.overallVerdict === "ALMOST" ? "border-amber-300 bg-amber-50" :
                      bulkReview.overallVerdict === "NOT_READY" ? "border-orange-300 bg-orange-50" :
                      "border-red-300 bg-red-50"
                    }`}>
                      <div className="flex items-center gap-3 mb-2">
                        <VerdictIcon verdict={bulkReview.overallVerdict} />
                        <div>
                          <p className="font-bold text-lg">{bulkReview.overallVerdict.replace("_", " ")}</p>
                          <p className="text-sm">{bulkReview.overallSummary}</p>
                        </div>
                        <div className="ml-auto text-right">
                          <p className="text-2xl font-bold">{bulkReview.readinessPercent}%</p>
                          <p className="text-xs text-muted-foreground">readiness</p>
                        </div>
                      </div>
                    </div>

                    {/* Critical issues */}
                    {bulkReview.criticalIssues?.length > 0 && (
                      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-sm font-bold text-red-800 mb-2 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" /> Critical Issues
                        </p>
                        <ul className="space-y-1">
                          {bulkReview.criticalIssues.map((issue, i) => (
                            <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                              <span className="font-bold shrink-0">{i + 1}.</span> {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Next action */}
                    {bulkReview.nextAction && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-medium text-blue-800 flex items-center gap-1">
                          <ArrowRight className="h-4 w-4 shrink-0" /> {bulkReview.nextAction}
                        </p>
                      </div>
                    )}

                    {/* Document-by-document */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                        Document-by-Document
                      </p>
                      {bulkReview.documents?.map(doc => (
                        <div key={doc.key} className="flex items-start gap-2 p-2.5 rounded border text-sm">
                          <VerdictBadge verdict={doc.verdict} />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{doc.label}</span>
                            <p className="text-xs text-muted-foreground">{doc.note}</p>
                            {doc.fix && <p className="text-xs text-red-600 mt-0.5">{doc.fix}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Single Document Review */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" /> Single Document Review
                </CardTitle>
                <CardDescription>
                  Select a document and describe what you have. AI will give a direct verdict.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Document to Review</label>
                  <Select value={reviewingDoc || ""} onValueChange={(v) => { setReviewingDoc(v); setSingleReview(null); }}>
                    <SelectTrigger><SelectValue placeholder="Select document" /></SelectTrigger>
                    <SelectContent>
                      {checklist.items.map(item => (
                        <SelectItem key={item.key} value={item.key}>
                          {item.label} {item.required ? "" : "(optional)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {reviewingDoc && (
                  <>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">
                        Describe your document
                      </label>
                      <Textarea
                        placeholder="e.g. 'I have my IELTS General results from March 2025: L8.0 R7.5 W7.0 S7.0. The test center was in Halifax.'"
                        value={reviewDetails}
                        onChange={e => setReviewDetails(e.target.value)}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        The more detail you provide, the better the review. Include dates, scores, issuer, format.
                      </p>
                    </div>
                    <Button onClick={() => runSingleReview(reviewingDoc)} disabled={loadingSingleReview}
                      size="sm">
                      {loadingSingleReview ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Reviewing...</>
                      ) : (
                        <><Sparkles className="h-4 w-4 mr-1" /> Review Document</>
                      )}
                    </Button>
                  </>
                )}

                {singleReview && (
                  <div className={`p-4 rounded-lg border-2 mt-2 ${
                    singleReview.verdict === "STRONG" || singleReview.verdict === "GOOD" ? "border-green-300 bg-green-50" :
                    singleReview.verdict === "WEAK" ? "border-amber-300 bg-amber-50" :
                    "border-red-300 bg-red-50"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <VerdictBadge verdict={singleReview.verdict} />
                      <span className="font-bold">{singleReview.verdict}</span>
                    </div>
                    <p className="text-sm">{singleReview.reason}</p>
                    {singleReview.fix && (
                      <p className="text-sm text-red-700 mt-2 font-medium flex items-center gap-1">
                        <ArrowRight className="h-3 w-3 shrink-0" /> {singleReview.fix}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function DocumentCheckItem({ item, checked, saving, onToggle, onReview }: {
  item: { key: string; label: string; description: string; required: boolean };
  checked: boolean;
  saving: boolean;
  onToggle: () => void;
  onReview: () => void;
}) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
      checked ? "bg-green-50/50 border-green-200" : "hover:bg-muted/50"
    }`}>
      <div className="mt-0.5 shrink-0 cursor-pointer" onClick={onToggle}>
        {saving ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : checked ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <Circle className="h-5 w-5 text-gray-300" />
        )}
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${checked ? "text-green-800" : ""}`}>{item.label}</span>
          {item.required && !checked && <span className="text-[10px] text-red-500 font-medium">REQUIRED</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
      </div>
      <Button variant="ghost" size="sm" className="shrink-0 text-xs h-7 px-2"
        onClick={(e) => { e.stopPropagation(); onReview(); }}>
        <Sparkles className="h-3 w-3 mr-1" /> Review
      </Button>
    </div>
  );
}

function VerdictIcon({ verdict }: { verdict: string }) {
  switch (verdict) {
    case "READY":
    case "STRONG":
    case "GOOD":
      return <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />;
    case "ALMOST":
    case "WEAK":
      return <AlertTriangle className="h-8 w-8 text-amber-500 shrink-0" />;
    case "NOT_READY":
    case "BAD":
      return <XCircle className="h-8 w-8 text-orange-500 shrink-0" />;
    default:
      return <AlertCircle className="h-8 w-8 text-red-500 shrink-0" />;
  }
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const color =
    verdict === "STRONG" || verdict === "GOOD" ? "bg-green-100 text-green-800" :
    verdict === "WEAK" ? "bg-amber-100 text-amber-800" :
    verdict === "BAD" ? "bg-orange-100 text-orange-800" :
    "bg-red-100 text-red-800";

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${color}`}>
      {verdict}
    </span>
  );
}
