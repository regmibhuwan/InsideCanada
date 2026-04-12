"use client";

import { useState, useMemo } from "react";
import { useCase } from "@/lib/use-case";
import { createClient } from "@/lib/supabase/client";
import { formatDate, daysUntil } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  CalendarClock, CheckCircle2, Circle, AlertTriangle, Plus,
  Loader2, Target, TrendingUp, Clock, Flag
} from "lucide-react";

export default function TimelinePage() {
  const { userCase, loading, refetch } = useCase();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", target_date: "", milestone_type: "custom" as string });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const timeline = useMemo(() => {
    if (!userCase.profile) return [];

    const events: Array<{
      id: string; date: string; title: string; description: string;
      category: "deadline" | "milestone" | "action" | "risk";
      status: "completed" | "upcoming" | "overdue" | "at_risk";
      priority: "low" | "medium" | "high" | "critical";
    }> = [];

    for (const permit of userCase.permits) {
      const days = daysUntil(permit.expiry_date);
      events.push({
        id: `permit-${permit.id}`,
        date: permit.expiry_date,
        title: `Work Permit Expires`,
        description: `Your ${permit.permit_type.replace(/_/g, " ")} expires. ${days <= 90 ? "Apply for extension now." : ""}`,
        category: "deadline",
        status: days < 0 ? "overdue" : days <= 30 ? "at_risk" : "upcoming",
        priority: days <= 30 ? "critical" : days <= 90 ? "high" : "medium",
      });
    }

    for (const passport of userCase.passports) {
      const days = daysUntil(passport.expiry_date);
      if (days <= 365) {
        events.push({
          id: `passport-${passport.id}`,
          date: passport.expiry_date,
          title: "Passport Expires",
          description: "Renew your passport — applications require 6+ months validity.",
          category: "deadline",
          status: days < 0 ? "overdue" : days <= 180 ? "at_risk" : "upcoming",
          priority: days <= 180 ? "high" : "medium",
        });
      }
    }

    for (const test of userCase.languageTests) {
      const days = daysUntil(test.expiry_date);
      if (days <= 365) {
        events.push({
          id: `lang-${test.id}`,
          date: test.expiry_date,
          title: `${test.test_type.toUpperCase()} Results Expire`,
          description: "Book a new test if you plan to use these results for PR.",
          category: "deadline",
          status: days < 0 ? "overdue" : days <= 90 ? "at_risk" : "upcoming",
          priority: days <= 90 ? "high" : "medium",
        });
      }
    }

    for (const m of userCase.milestones) {
      events.push({
        id: `milestone-${m.id}`,
        date: m.target_date || m.completed_date || m.created_at.split("T")[0],
        title: m.title,
        description: m.description || "",
        category: "milestone",
        status: m.is_completed ? "completed" : m.target_date && daysUntil(m.target_date) < 0 ? "overdue" : "upcoming",
        priority: "medium",
      });
    }

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [userCase]);

  async function handleAddMilestone() {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("milestones").insert({
      user_id: userCase.profile.id,
      milestone_type: form.milestone_type,
      title: form.title,
      description: form.description,
      target_date: form.target_date || null,
      sort_order: userCase.milestones.length,
    });
    setOpen(false);
    setForm({ title: "", description: "", target_date: "", milestone_type: "custom" });
    await refetch();
    setSaving(false);
  }

  async function toggleMilestone(id: string, completed: boolean) {
    const supabase = createClient();
    await supabase.from("milestones").update({
      is_completed: !completed,
      completed_date: !completed ? new Date().toISOString().split("T")[0] : null,
    }).eq("id", id);
    await refetch();
  }

  async function generateTimeline() {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userCase }),
      });
      const data = await res.json();
      if (data.milestones) {
        const supabase = createClient();
        for (const m of data.milestones) {
          await supabase.from("milestones").insert({
            user_id: userCase.profile.id,
            milestone_type: m.type || "custom",
            title: m.title,
            description: m.description,
            target_date: m.target_date || null,
            sort_order: userCase.milestones.length,
          });
        }
        await refetch();
      }
    } catch (err) {
      console.error("Failed to generate timeline:", err);
    }
    setGenerating(false);
  }

  const completed = userCase.milestones.filter(m => m.is_completed).length;
  const total = Math.max(userCase.milestones.length, 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Your Immigration Timeline</h1>
          <p className="text-muted-foreground mt-1">Track deadlines, milestones, and your path to PR.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={generateTimeline} disabled={generating} variant="outline">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
            AI Generate
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> Add Milestone</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Milestone</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g., Submit Express Entry Profile" required />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional details" />
                </div>
                <div className="space-y-2">
                  <Label>Target Date</Label>
                  <Input type="date" value={form.target_date} onChange={e => setForm({ ...form, target_date: e.target.value })} />
                </div>
                <Button onClick={handleAddMilestone} disabled={saving || !form.title} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add Milestone
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <span className="font-medium">PR Journey Progress</span>
            </div>
            <span className="text-sm text-muted-foreground">{completed}/{total} milestones</span>
          </div>
          <Progress value={(completed / total) * 100} />
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="space-y-1">
        {timeline.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarClock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-semibold text-lg mb-2">No timeline events yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your permits, work history, and milestones to build your timeline.<br />
                Or let AI generate a personalized plan.
              </p>
              <Button onClick={generateTimeline} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                Generate My Timeline
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
            {timeline.map((event, index) => {
              const isPast = event.status === "completed" || event.status === "overdue";
              return (
                <div key={event.id} className="relative pl-14 pb-8" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className={`absolute left-4 top-1 h-5 w-5 rounded-full border-2 flex items-center justify-center bg-white z-10 ${
                    event.status === "completed" ? "border-green-500" :
                    event.status === "overdue" ? "border-red-500" :
                    event.status === "at_risk" ? "border-amber-500" :
                    "border-blue-500"
                  }`}>
                    {event.status === "completed" ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : event.status === "overdue" ? (
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                    ) : event.status === "at_risk" ? (
                      <Clock className="h-3 w-3 text-amber-500" />
                    ) : (
                      <Circle className="h-3 w-3 text-blue-500" />
                    )}
                  </div>

                  <div className={`p-4 rounded-lg border ${
                    event.status === "overdue" ? "border-red-200 bg-red-50/50" :
                    event.status === "at_risk" ? "border-amber-200 bg-amber-50/50" :
                    event.status === "completed" ? "border-green-200 bg-green-50/50" :
                    "bg-white"
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{event.title}</p>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={
                          event.category === "deadline" ? "danger" :
                          event.category === "milestone" ? "default" :
                          "secondary"
                        }>
                          {event.category}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      {formatDate(event.date)}
                      {event.status === "overdue" && " — Overdue"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Milestones checklist */}
      {userCase.milestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-primary" />
              Milestones Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {userCase.milestones.map((m) => (
              <button
                key={m.id}
                onClick={() => toggleMilestone(m.id, m.is_completed)}
                className="flex items-center gap-3 w-full text-left p-3 rounded-lg hover:bg-muted transition-colors"
              >
                {m.is_completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${m.is_completed ? "line-through text-muted-foreground" : ""}`}>
                    {m.title}
                  </p>
                  {m.description && (
                    <p className="text-xs text-muted-foreground">{m.description}</p>
                  )}
                </div>
                {m.target_date && (
                  <span className="text-xs text-muted-foreground shrink-0">{formatDate(m.target_date)}</span>
                )}
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
