"use client";

import { useState } from "react";
import { useCase } from "@/lib/use-case";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Shield, Phone, Mail, Loader2, Send,
  CheckCircle2, AlertTriangle, Scale, Star,
  Construction, MapPin, Globe, Award, Clock
} from "lucide-react";

const DEMO_RCICS = [
  {
    name: "Priya Sharma, RCIC",
    title: "Regulated Canadian Immigration Consultant",
    specialties: ["Express Entry", "PNP", "PGWP Extensions"],
    languages: ["English", "Hindi", "Punjabi"],
    province: "Ontario",
    experience: "8+ years",
    rating: 4.9,
  },
  {
    name: "Marc-André Dubois, RCIC",
    title: "Regulated Canadian Immigration Consultant",
    specialties: ["French Streams", "Quebec Immigration", "Family Sponsorship"],
    languages: ["English", "French"],
    province: "Quebec",
    experience: "12+ years",
    rating: 4.8,
  },
  {
    name: "Sarah Chen, RCIC",
    title: "Regulated Canadian Immigration Consultant",
    specialties: ["BC PNP", "LMIA", "Work Permit Extensions"],
    languages: ["English", "Mandarin", "Cantonese"],
    province: "British Columbia",
    experience: "6+ years",
    rating: 4.9,
  },
  {
    name: "Ahmed Hassan, Immigration Lawyer",
    title: "Barrister & Solicitor — Immigration Law",
    specialties: ["Refusals & Appeals", "Judicial Reviews", "Complex Cases"],
    languages: ["English", "Arabic", "French"],
    province: "Ontario",
    experience: "15+ years",
    rating: 5.0,
  },
  {
    name: "Emily MacDonald, RCIC",
    title: "Regulated Canadian Immigration Consultant",
    specialties: ["Atlantic Immigration (AIP)", "NSNP", "PEI PNP"],
    languages: ["English"],
    province: "Nova Scotia",
    experience: "7+ years",
    rating: 4.7,
  },
];

export default function EscalationPage() {
  const { userCase, loading } = useCase();
  const [form, setForm] = useState({
    consultation_type: "general_assessment",
    urgency: "normal",
    subject: "",
    description: "",
    preferred_language: "english",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          user_name: userCase.profile?.full_name,
          user_email: userCase.profile?.email,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        setSubmitError("Failed to send request. Please try again.");
      }
    } catch {
      setSubmitError("Connection error. Please try again.");
    }
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

      {/* Under construction banner */}
      <Card className="border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Construction className="h-6 w-6 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-blue-900">RCIC Network — Coming Soon</p>
              <p className="text-sm text-blue-800 mt-1">
                We are currently onboarding licensed RCICs (Regulated Canadian Immigration Consultants) and immigration
                lawyers to our platform. The profiles below are preview examples of the type of professionals who will
                be available. In the meantime, you can still <strong>submit a consultation request</strong> below and
                our team will personally review it and connect you with a qualified professional.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* When to escalate */}
      <Card className="border-amber-200 bg-amber-50/30">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-900">When should you talk to a professional?</p>
              <ul className="mt-2 space-y-1 text-sm text-amber-800">
                <li>• Your permit has expired or you&apos;re at risk of losing status</li>
                <li>• You received a refusal or procedural fairness letter</li>
                <li>• You need help with maintained status or complex transitions</li>
                <li>• Your employer is non-compliant or you need an LMIA</li>
                <li>• You&apos;re unsure about your eligibility for any program</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo RCIC profiles */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Featured Professionals</h2>
          <Badge variant="secondary" className="text-[10px]">Preview</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEMO_RCICS.map((rcic, i) => (
            <Card key={i} className="relative overflow-hidden opacity-90">
              <div className="absolute top-0 right-0 bg-blue-100 text-blue-700 text-[9px] font-bold px-2 py-0.5 rounded-bl">
                PREVIEW
              </div>
              <CardContent className="p-4 space-y-3">
                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <h3 className="font-semibold text-sm">{rcic.name}</h3>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{rcic.title}</p>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{rcic.province}</span>
                  <span>·</span>
                  <Clock className="h-3 w-3" />
                  <span>{rcic.experience}</span>
                  <span>·</span>
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                  <span>{rcic.rating}</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {rcic.specialties.map(s => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{s}</span>
                  ))}
                </div>

                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  {rcic.languages.join(" · ")}
                </div>

                <Button variant="outline" size="sm" className="w-full text-xs" disabled>
                  <Award className="h-3 w-3 mr-1" /> Book Consultation — Coming Soon
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request Form */}
        <div className="lg:col-span-2">
          {submitted ? (
            <Card className="border-green-200 bg-green-50/30">
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <h3 className="text-xl font-semibold mb-2">Request Sent Successfully</h3>
                <p className="text-muted-foreground mb-2">
                  Your consultation request has been sent to our team. We will review your case
                  and get back to you via email as soon as possible.
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Check your email ({userCase.profile?.email}) for a response.
                </p>
                <Button onClick={() => {
                  setSubmitted(false);
                  setForm({ consultation_type: "general_assessment", urgency: "normal", subject: "", description: "", preferred_language: "english" });
                }}>
                  Submit Another Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Request a Consultation
                </CardTitle>
                <CardDescription>
                  Describe your situation and our team will connect you with a qualified RCIC or lawyer.
                  Your request goes directly to our review team.
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
                        <SelectItem value="nepali">Nepali</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {submitError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                      {submitError}
                    </div>
                  )}

                  <Button type="submit" disabled={submitting || !form.subject} className="w-full">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Submit Consultation Request
                  </Button>
                  <p className="text-[11px] text-center text-muted-foreground">
                    Your request will be reviewed by our team and forwarded to a suitable professional.
                  </p>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                How It Works
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
                  <p className="font-medium">Team reviews</p>
                  <p className="text-muted-foreground text-xs">We assess your case and find the right match</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-700">3</span>
                </div>
                <div>
                  <p className="font-medium">Get connected</p>
                  <p className="text-muted-foreground text-xs">We connect you with a licensed RCIC or lawyer</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-700">4</span>
                </div>
                <div>
                  <p className="font-medium">Consultation</p>
                  <p className="text-muted-foreground text-xs">Meet with your advisor and get an action plan</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                Our Standards
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>We are building a network of professionals who are:</p>
              <ul className="space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  Licensed RCICs or immigration lawyers
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  In good standing with CICC / law societies
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  Experienced with PGWP, PNP, and PR transitions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  Vetted and reviewed by our team
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
                    select &quot;Emergency&quot; urgency in the form. We prioritize these requests.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted">
            <CardContent className="p-5">
              <div className="flex items-start gap-2">
                <Mail className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Direct Contact</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You can also reach us directly at{" "}
                    <a href="mailto:regmibhuwan555@gmail.com" className="text-primary hover:underline">
                      regmibhuwan555@gmail.com
                    </a>
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
