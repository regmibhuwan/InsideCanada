"use client";

import { useState } from "react";
import { useCase } from "@/lib/use-case";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Shield, Phone, Mail, Calendar, Loader2, Send,
  CheckCircle2, Clock, AlertTriangle, Scale, Briefcase, Star
} from "lucide-react";

export default function EscalationPage() {
  const { userCase, loading, refetch } = useCase();
  const [form, setForm] = useState({
    consultation_type: "general_assessment",
    urgency: "normal",
    subject: "",
    description: "",
    preferred_language: "english",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const supabase = createClient();
    await supabase.from("consultations").insert({
      ...form,
      user_id: userCase.profile.id,
    });
    await refetch();
    setSubmitted(true);
    setSubmitting(false);
  }

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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Get Expert Help</h1>
        <p className="text-muted-foreground mt-1">
          Connect with licensed immigration consultants (RCICs) and lawyers for complex situations.
        </p>
      </div>

      {/* When to escalate */}
      <Card className="border-amber-200 bg-amber-50/30">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-900">When should you talk to a professional?</p>
              <ul className="mt-2 space-y-1 text-sm text-amber-800">
                <li>• Your permit has expired or you're at risk of losing status</li>
                <li>• You received a refusal or procedural fairness letter</li>
                <li>• You need help with maintained status or complex transitions</li>
                <li>• Your employer is non-compliant or you need an LMIA</li>
                <li>• You're unsure about your eligibility for any program</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request Form */}
        <div className="lg:col-span-2">
          {submitted ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <h3 className="text-xl font-semibold mb-2">Request Submitted</h3>
                <p className="text-muted-foreground mb-6">
                  Your consultation request has been recorded. A qualified advisor will be matched
                  to your case and will reach out within 24-48 hours.
                </p>
                <Button onClick={() => { setSubmitted(false); setForm({ consultation_type: "general_assessment", urgency: "normal", subject: "", description: "", preferred_language: "english" }); }}>
                  Submit Another Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Request a Consultation</CardTitle>
                <CardDescription>
                  Describe your situation and we&apos;ll match you with the right professional.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Consultation Type</Label>
                      <Select value={form.consultation_type} onValueChange={v => setForm({ ...form, consultation_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general_assessment">General Assessment</SelectItem>
                          <SelectItem value="pr_strategy">PR Strategy</SelectItem>
                          <SelectItem value="work_permit_extension">Work Permit Extension</SelectItem>
                          <SelectItem value="maintained_status">Maintained Status</SelectItem>
                          <SelectItem value="refusal_review">Refusal Review</SelectItem>
                          <SelectItem value="appeal">Appeal</SelectItem>
                          <SelectItem value="pnp_advice">PNP Advice</SelectItem>
                          <SelectItem value="employer_compliance">Employer Compliance</SelectItem>
                          <SelectItem value="urgent">Urgent Matter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Urgency</Label>
                      <Select value={form.urgency} onValueChange={v => setForm({ ...form, urgency: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal (within a week)</SelectItem>
                          <SelectItem value="urgent">Urgent (within 48 hours)</SelectItem>
                          <SelectItem value="emergency">Emergency (within 24 hours)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input
                      value={form.subject}
                      onChange={e => setForm({ ...form, subject: e.target.value })}
                      placeholder="Brief summary of your situation"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      placeholder="Provide details about your situation, what you've tried, and what help you need..."
                      rows={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred Language</Label>
                    <Select value={form.preferred_language} onValueChange={v => setForm({ ...form, preferred_language: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="english">English</SelectItem>
                        <SelectItem value="french">French</SelectItem>
                        <SelectItem value="hindi">Hindi</SelectItem>
                        <SelectItem value="punjabi">Punjabi</SelectItem>
                        <SelectItem value="mandarin">Mandarin</SelectItem>
                        <SelectItem value="tagalog">Tagalog</SelectItem>
                        <SelectItem value="spanish">Spanish</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={submitting || !form.subject} className="w-full">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Submit Consultation Request
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Past Consultations */}
          {userCase.milestones.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Past Consultations</CardTitle>
              </CardHeader>
              <CardContent>
                {/* We're using consultations from userCase if available */}
                <p className="text-sm text-muted-foreground">
                  Your consultation history will appear here once you&apos;ve had sessions.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                What to Expect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-700">1</span>
                </div>
                <div>
                  <p className="font-medium">Submit your request</p>
                  <p className="text-muted-foreground text-xs">Describe your situation clearly</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-700">2</span>
                </div>
                <div>
                  <p className="font-medium">Get matched</p>
                  <p className="text-muted-foreground text-xs">We find the right RCIC or lawyer</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-700">3</span>
                </div>
                <div>
                  <p className="font-medium">Consultation</p>
                  <p className="text-muted-foreground text-xs">Meet with your advisor</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-700">4</span>
                </div>
                <div>
                  <p className="font-medium">Action plan</p>
                  <p className="text-muted-foreground text-xs">Receive clear next steps</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                Professionals Only
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>All advisors on InsideCanada are:</p>
              <ul className="space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  Licensed RCICs or immigration lawyers
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  In good standing with regulatory bodies
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  Experienced with PGWP → PR transitions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  Specialized in Canadian immigration
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-5">
              <div className="flex items-start gap-2">
                <Phone className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 text-sm">Emergency?</p>
                  <p className="text-xs text-red-700 mt-1">
                    If you&apos;re at risk of deportation or have an urgent CBSA matter,
                    select &quot;Emergency&quot; urgency above or contact ICCRC directly.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
