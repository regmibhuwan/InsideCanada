"use client";

import { useState, useEffect } from "react";
import { useCase } from "@/lib/use-case";
import { createClient } from "@/lib/supabase/client";
import { PR_STREAM_CHECKLISTS, getChecklistForStream } from "@/lib/document-checklists";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckCircle2, Circle, Shield, Loader2, AlertTriangle,
  FileCheck, Info, ChevronDown, ChevronUp
} from "lucide-react";

interface ReadinessItem {
  id: string;
  document_key: string;
  has_document: boolean;
  notes: string | null;
  stream: string;
}

export default function DocumentsPage() {
  const { userCase, loading } = useCase();
  const [selectedStream, setSelectedStream] = useState<string>("");
  const [readiness, setReadiness] = useState<ReadinessItem[]>([]);
  const [loadingReadiness, setLoadingReadiness] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && userCase.profile) {
      const defaultStream = userCase.profile.target_pr_stream ||
        (userCase.profile.immigration_status === "pgwp_holder" ? "pgwp" :
          userCase.profile.has_applied_pr ? "cec" : "cec");
      setSelectedStream(defaultStream);
    }
  }, [loading, userCase.profile]);

  useEffect(() => {
    if (selectedStream && userCase.profile) {
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
  const totalItems = checklist?.items.length || 0;
  const completedItems = checklist?.items.filter(i => readinessMap.get(i.key)).length || 0;
  const progressPercent = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0;
  const isReady = completedRequired === totalRequired;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Document Readiness</h1>
        <p className="text-muted-foreground mt-1">
          Check off documents you already have. No uploads needed — just confirm you have them ready.
        </p>
      </div>

      {/* Stream Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1 block">Which stream are you preparing for?</label>
              <Select value={selectedStream} onValueChange={setSelectedStream}>
                <SelectTrigger><SelectValue placeholder="Select stream" /></SelectTrigger>
                <SelectContent>
                  {PR_STREAM_CHECKLISTS.map(s => (
                    <SelectItem key={s.stream} value={s.stream}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{progressPercent}%</p>
              <p className="text-xs text-muted-foreground">{completedRequired}/{totalRequired} required</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress + Readiness Status */}
      {checklist && (
        <>
          <Card className={isReady ? "border-green-300 bg-green-50/50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                {isReady ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                )}
                <div>
                  <p className="font-semibold">
                    {isReady ? "You have all required documents!" : `${totalRequired - completedRequired} required documents remaining`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isReady
                      ? "You appear ready to apply. Double-check that all documents are current and valid."
                      : "Check off each document as you gather them."}
                  </p>
                </div>
              </div>
              <Progress value={progressPercent} className="h-3" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                {checklist.label} — Document Checklist
              </CardTitle>
              <CardDescription>{checklist.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingReadiness ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Required documents */}
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-2 pb-1">Required Documents</p>
                  {checklist.items.filter(i => i.required).map(item => (
                    <DocumentCheckItem
                      key={item.key}
                      item={item}
                      checked={readinessMap.get(item.key) || false}
                      saving={saving === item.key}
                      onToggle={() => toggleDocument(item.key, readinessMap.get(item.key) || false)}
                    />
                  ))}

                  {/* Optional documents */}
                  {checklist.items.some(i => !i.required) && (
                    <>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-4 pb-1">Optional (Recommended)</p>
                      {checklist.items.filter(i => !i.required).map(item => (
                        <DocumentCheckItem
                          key={item.key}
                          item={item}
                          checked={readinessMap.get(item.key) || false}
                          saving={saving === item.key}
                          onToggle={() => toggleDocument(item.key, readinessMap.get(item.key) || false)}
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function DocumentCheckItem({ item, checked, saving, onToggle }: {
  item: { key: string; label: string; description: string; required: boolean };
  checked: boolean;
  saving: boolean;
  onToggle: () => void;
}) {
  const [showDesc, setShowDesc] = useState(false);

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
      checked ? "bg-green-50/50 border-green-200" : "hover:bg-muted/50"
    }`} onClick={onToggle}>
      <div className="mt-0.5 shrink-0">
        {saving ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : checked ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <Circle className="h-5 w-5 text-gray-300" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${checked ? "text-green-800" : ""}`}>{item.label}</span>
          {item.required && !checked && <span className="text-[10px] text-red-500 font-medium">REQUIRED</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
      </div>
    </div>
  );
}
