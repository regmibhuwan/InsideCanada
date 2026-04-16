"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PROVINCES } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRight, ArrowLeft, MapPin, CheckCircle2 } from "lucide-react";

const STEPS = [
  { title: "About You", desc: "Basic personal information" },
  { title: "Immigration Status", desc: "Your current status in Canada" },
  { title: "PR Plans", desc: "Have you applied or are you planning to?" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    date_of_birth: "",
    nationality: "",
    phone: "",
    current_city: "",
    current_province: "",
    immigration_status: "pgwp_holder",
    pgwp_stream: "",
    has_applied_pr: false,
    target_pr_stream: "",
    crs_score: "",
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profile) {
        if (profile.onboarding_completed) {
          router.push("/dashboard");
          return;
        }
        setProfileId(profile.id);
        setForm(prev => ({
          ...prev,
          full_name: profile.full_name || prev.full_name,
          date_of_birth: profile.date_of_birth || "",
          nationality: profile.nationality || "",
          phone: profile.phone || "",
          current_city: profile.current_city || "",
          current_province: profile.current_province || "",
          immigration_status: profile.immigration_status || "pgwp_holder",
          pgwp_stream: profile.pgwp_stream || "",
          has_applied_pr: profile.has_applied_pr || false,
          target_pr_stream: profile.target_pr_stream || "",
          crs_score: profile.crs_score?.toString() || "",
        }));
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    setSaving(true);
    setSubmitError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSubmitError("Your session expired. Please log in again.");
        router.push("/login");
        return;
      }

      const updateData: any = {
        full_name: form.full_name,
        date_of_birth: form.date_of_birth || null,
        nationality: form.nationality || null,
        phone: form.phone || null,
        current_city: form.current_city || null,
        current_province: form.current_province || null,
        immigration_status: form.immigration_status,
        pgwp_stream: form.pgwp_stream || null,
        has_applied_pr: form.has_applied_pr,
        target_pr_stream: form.target_pr_stream || null,
        crs_score: form.crs_score ? parseInt(form.crs_score) : null,
        onboarding_completed: true,
        onboarding_step: 3,
      };

      const rowId = profileId || user.id;
      const { error } = await supabase.from("profiles").update(updateData).eq("id", rowId);
      if (error) {
        setSubmitError("Could not finish setup. Please try again.");
        return;
      }

      router.push("/dashboard");
    } catch {
      setSubmitError("Could not finish setup. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function canProceed(): boolean {
    if (step === 0) return !!form.full_name && !!form.current_province;
    if (step === 1) return !!form.immigration_status;
    return true;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold">InsideCanada</span>
          </div>
          <h1 className="text-xl font-semibold">Let&apos;s set up your profile</h1>
          <p className="text-muted-foreground text-sm mt-1">This helps us personalize everything for your case.</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i < step ? "bg-primary text-white" : i === step ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step].title}</CardTitle>
            <CardDescription>{STEPS[step].desc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label>Full Name (as on passport) *</Label>
                  <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="John Doe" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nationality</Label>
                    <Input value={form.nationality} onChange={e => setForm({ ...form, nationality: e.target.value })} placeholder="e.g., Indian" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input value={form.current_city} onChange={e => setForm({ ...form, current_city: e.target.value })} placeholder="e.g., Toronto" />
                  </div>
                  <div className="space-y-2">
                    <Label>Province *</Label>
                    <Select value={form.current_province} onValueChange={v => setForm({ ...form, current_province: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {PROVINCES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 (xxx) xxx-xxxx" />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Current Immigration Status *</Label>
                  <Select value={form.immigration_status} onValueChange={v => setForm({ ...form, immigration_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pgwp_holder">PGWP Holder</SelectItem>
                      <SelectItem value="student_visa">Study Permit</SelectItem>
                      <SelectItem value="work_permit">Work Permit (LMIA / Closed)</SelectItem>
                      <SelectItem value="maintained_status">Maintained / Implied Status</SelectItem>
                      <SelectItem value="bridging_open_wp">Bridging Open Work Permit</SelectItem>
                      <SelectItem value="pr_applicant">PR Applicant (waiting)</SelectItem>
                      <SelectItem value="pr_holder">PR Holder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.immigration_status === "pgwp_holder" && (
                  <div className="space-y-2">
                    <Label>PGWP Stream</Label>
                    <Select value={form.pgwp_stream} onValueChange={v => setForm({ ...form, pgwp_stream: v })}>
                      <SelectTrigger><SelectValue placeholder="Select stream" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3_year">3-Year PGWP</SelectItem>
                        <SelectItem value="18_month">18-Month PGWP</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                  This determines which updates, alerts, and eligibility checks you see. You can change it anytime in your profile.
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer p-4 rounded-lg border hover:border-primary/30 transition-colors">
                    <input
                      type="radio"
                      name="pr_status"
                      checked={!form.has_applied_pr}
                      onChange={() => setForm({ ...form, has_applied_pr: false })}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium">I haven&apos;t applied for PR yet</p>
                      <p className="text-sm text-muted-foreground">I&apos;m planning, exploring pathways, or building eligibility.</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer p-4 rounded-lg border hover:border-primary/30 transition-colors">
                    <input
                      type="radio"
                      name="pr_status"
                      checked={form.has_applied_pr}
                      onChange={() => setForm({ ...form, has_applied_pr: true })}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium">I have already applied for PR</p>
                      <p className="text-sm text-muted-foreground">I submitted my application and I&apos;m waiting for a decision.</p>
                    </div>
                  </label>
                </div>

                {!form.has_applied_pr && (
                  <div className="space-y-2">
                    <Label>Target PR Stream</Label>
                    <Select value={form.target_pr_stream} onValueChange={v => setForm({ ...form, target_pr_stream: v })}>
                      <SelectTrigger><SelectValue placeholder="Select pathway" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cec">Canadian Experience Class (CEC)</SelectItem>
                        <SelectItem value="fsw">Federal Skilled Worker (FSW)</SelectItem>
                        <SelectItem value="pnp">Provincial Nominee (PNP)</SelectItem>
                        <SelectItem value="fst">Federal Skilled Trades</SelectItem>
                        <SelectItem value="atlantic">Atlantic Immigration</SelectItem>
                        <SelectItem value="unsure">Not sure yet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {form.has_applied_pr && (
                  <div className="space-y-2">
                    <Label>CRS Score (at ITA)</Label>
                    <Input type="number" value={form.crs_score} onChange={e => setForm({ ...form, crs_score: e.target.value })} placeholder="e.g., 490" />
                  </div>
                )}
              </>
            )}

            {submitError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                {submitError}
              </div>
            )}

            <div className="flex justify-between pt-4">
              {step > 0 ? (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
              ) : <div />}
              <Button onClick={handleNext} disabled={!canProceed() || saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {step === STEPS.length - 1 ? "Finish Setup" : "Continue"}
                {step < STEPS.length - 1 && <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
