"use client";

import { useState } from "react";
import { useCase } from "@/lib/use-case";
import { createClient } from "@/lib/supabase/client";
import { formatDate, statusLabel, permitLabel, sanitizeForDB, prStageLabel, prProgramLabel } from "@/lib/utils";
import { PROVINCES, TEER_LABELS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  User, Shield, BookOpen, Briefcase, GraduationCap, Languages,
  Plus, Loader2, Save, Trash2, Calendar, FileCheck
} from "lucide-react";

export default function ProfilePage() {
  const { userCase, loading, refetch } = useCase();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");

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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Immigration Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your personal information, permits, work history, and more.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 sm:grid-cols-7 w-full">
          <TabsTrigger value="personal"><User className="h-4 w-4 mr-1.5 hidden sm:inline" />Personal</TabsTrigger>
          <TabsTrigger value="permits"><Shield className="h-4 w-4 mr-1.5 hidden sm:inline" />Permits</TabsTrigger>
          <TabsTrigger value="passport"><BookOpen className="h-4 w-4 mr-1.5 hidden sm:inline" />Passport</TabsTrigger>
          <TabsTrigger value="work"><Briefcase className="h-4 w-4 mr-1.5 hidden sm:inline" />Work</TabsTrigger>
          <TabsTrigger value="education"><GraduationCap className="h-4 w-4 mr-1.5 hidden sm:inline" />Education</TabsTrigger>
          <TabsTrigger value="language"><Languages className="h-4 w-4 mr-1.5 hidden sm:inline" />Language</TabsTrigger>
          <TabsTrigger value="pr_application"><FileCheck className="h-4 w-4 mr-1.5 hidden sm:inline" />PR App</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <PersonalInfoTab profile={userCase.profile} refetch={refetch} />
        </TabsContent>
        <TabsContent value="permits">
          <PermitsTab permits={userCase.permits} profileId={userCase.profile?.id} refetch={refetch} />
        </TabsContent>
        <TabsContent value="passport">
          <PassportTab passports={userCase.passports} profileId={userCase.profile?.id} refetch={refetch} />
        </TabsContent>
        <TabsContent value="work">
          <WorkHistoryTab workHistory={userCase.workHistory} profileId={userCase.profile?.id} refetch={refetch} />
        </TabsContent>
        <TabsContent value="education">
          <EducationTab educationHistory={userCase.educationHistory} profileId={userCase.profile?.id} refetch={refetch} />
        </TabsContent>
        <TabsContent value="language">
          <LanguageTab languageTests={userCase.languageTests} profileId={userCase.profile?.id} refetch={refetch} />
        </TabsContent>
        <TabsContent value="pr_application">
          <PRApplicationTab prApplications={userCase.prApplications} profile={userCase.profile} profileId={userCase.profile?.id} refetch={refetch} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PersonalInfoTab({ profile, refetch }: { profile: any; refetch: () => void }) {
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    date_of_birth: profile?.date_of_birth || "",
    nationality: profile?.nationality || "",
    current_city: profile?.current_city || "",
    current_province: profile?.current_province || "",
    immigration_status: profile?.immigration_status || "pgwp_holder",
    pgwp_stream: profile?.pgwp_stream || "",
    has_applied_pr: profile?.has_applied_pr || false,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const data = sanitizeForDB({ ...form });
    await supabase.from("profiles").update(data).eq("id", profile.id);
    await refetch();
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>Keep this updated — it affects your eligibility checks and timeline.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Full Name (as on passport)</Label>
            <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 (xxx) xxx-xxxx" />
          </div>
          <div className="space-y-2">
            <Label>Date of Birth</Label>
            <Input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Nationality</Label>
            <Input value={form.nationality} onChange={e => setForm({ ...form, nationality: e.target.value })} placeholder="e.g., Indian, Filipino" />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={form.current_city} onChange={e => setForm({ ...form, current_city: e.target.value })} placeholder="e.g., Toronto" />
          </div>
          <div className="space-y-2">
            <Label>Province</Label>
            <Select value={form.current_province} onValueChange={v => setForm({ ...form, current_province: v })}>
              <SelectTrigger><SelectValue placeholder="Select province" /></SelectTrigger>
              <SelectContent>
                {PROVINCES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Immigration Status</Label>
            <Select value={form.immigration_status} onValueChange={v => setForm({ ...form, immigration_status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pgwp_holder">PGWP Holder</SelectItem>
                <SelectItem value="student_visa">Study Permit</SelectItem>
                <SelectItem value="work_permit">Work Permit</SelectItem>
                <SelectItem value="maintained_status">Maintained Status</SelectItem>
                <SelectItem value="bridging_open_wp">Bridging Open WP</SelectItem>
                <SelectItem value="pr_applicant">PR Applicant</SelectItem>
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
        </div>

        <div className="border-t pt-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.has_applied_pr}
              onChange={e => setForm({ ...form, has_applied_pr: e.target.checked })}
              className="rounded h-5 w-5"
            />
            <div>
              <p className="font-medium">I have already applied for Permanent Residency</p>
              <p className="text-sm text-muted-foreground">Enable PR application tracking, draw monitoring, and processing time updates</p>
            </div>
          </label>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}

function PermitsTab({ permits, profileId, refetch }: { permits: any[]; profileId: string; refetch: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    permit_type: "pgwp", permit_number: "", issue_date: "", expiry_date: "",
    employer_name: "", notes: "", is_maintained_status: false, extension_applied: false,
  });
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    setSaving(true);
    const supabase = createClient();
    const data = sanitizeForDB({ ...form, user_id: profileId, status: "active" });
    await supabase.from("permits").insert(data);
    setOpen(false);
    setForm({ permit_type: "pgwp", permit_number: "", issue_date: "", expiry_date: "", employer_name: "", notes: "", is_maintained_status: false, extension_applied: false });
    await refetch();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("permits").delete().eq("id", id);
    await refetch();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Work Permits & Status</CardTitle>
          <CardDescription>Track all your permits and their expiry dates.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" /> Add Permit</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add a Permit</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Permit Type</Label>
                <Select value={form.permit_type} onValueChange={v => setForm({ ...form, permit_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pgwp">Post-Graduation Work Permit</SelectItem>
                    <SelectItem value="closed_work_permit">Closed Work Permit</SelectItem>
                    <SelectItem value="open_work_permit">Open Work Permit</SelectItem>
                    <SelectItem value="bridging_open_wp">Bridging Open Work Permit</SelectItem>
                    <SelectItem value="lmia_work_permit">LMIA Work Permit</SelectItem>
                    <SelectItem value="study_permit">Study Permit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Issue Date</Label>
                  <Input type="date" value={form.issue_date} onChange={e => setForm({ ...form, issue_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date</Label>
                  <Input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Permit Number</Label>
                <Input value={form.permit_number} onChange={e => setForm({ ...form, permit_number: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Employer (if applicable)</Label>
                <Input value={form.employer_name} onChange={e => setForm({ ...form, employer_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any additional details..." />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.is_maintained_status} onChange={e => setForm({ ...form, is_maintained_status: e.target.checked })} className="rounded" />
                  On maintained/implied status
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.extension_applied} onChange={e => setForm({ ...form, extension_applied: e.target.checked })} className="rounded" />
                  Extension applied
                </label>
              </div>
              <Button onClick={handleAdd} disabled={saving || !form.expiry_date} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Permit
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {permits.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No permits added yet. Add your current work permit to start tracking.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {permits.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{permitLabel(p.permit_type)}</p>
                    <Badge variant={p.status === "active" ? "success" : p.status === "expired" ? "danger" : "warning"}>
                      {p.status}
                    </Badge>
                    {p.is_maintained_status && <Badge variant="warning">Maintained</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Expires: {formatDate(p.expiry_date)}
                    {p.employer_name && ` · ${p.employer_name}`}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PassportTab({ passports, profileId, refetch }: { passports: any[]; profileId: string; refetch: () => void }) {
  const [form, setForm] = useState({ country_of_issue: "", expiry_date: "", passport_number: "" });
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    setSaving(true);
    const supabase = createClient();
    const data = sanitizeForDB({ ...form, user_id: profileId });
    await supabase.from("passports").insert(data);
    setForm({ country_of_issue: "", expiry_date: "", passport_number: "" });
    await refetch();
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Passport</CardTitle>
        <CardDescription>Track your passport validity — many applications require 6+ months validity.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {passports.map((p) => (
          <div key={p.id} className="p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="font-medium">{p.country_of_issue}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Expires: {formatDate(p.expiry_date)}</p>
          </div>
        ))}
        <div className="border-t pt-4 space-y-3">
          <p className="font-medium text-sm">Add Passport</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input placeholder="Country of issue" value={form.country_of_issue} onChange={e => setForm({ ...form, country_of_issue: e.target.value })} />
            <Input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
            <Input placeholder="Passport number" value={form.passport_number} onChange={e => setForm({ ...form, passport_number: e.target.value })} />
          </div>
          <Button onClick={handleAdd} disabled={saving || !form.country_of_issue || !form.expiry_date} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Passport
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function WorkHistoryTab({ workHistory, profileId, refetch }: { workHistory: any[]; profileId: string; refetch: () => void }) {
  const defaultForm = {
    job_title: "", employer_name: "", noc_code: "", teer_category: "",
    is_canadian_experience: true, province: "", city: "",
    start_date: "", end_date: "", is_current: false, hours_per_week: 40,
    is_full_time: true, duties: "",
  };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    setSaving(true);
    const supabase = createClient();
    const data = sanitizeForDB({
      ...form,
      user_id: profileId,
      end_date: form.is_current ? null : form.end_date,
    });
    const { error } = await supabase.from("work_history").insert(data);
    if (error) {
      console.error("Failed to add work history:", error);
      setSaving(false);
      return;
    }
    setOpen(false);
    setForm(defaultForm);
    await refetch();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("work_history").delete().eq("id", id);
    await refetch();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Work History</CardTitle>
          <CardDescription>Canadian experience is key for CEC eligibility. Track carefully.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" /> Add Job</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Work Experience</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Job Title</Label>
                  <Input value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Employer</Label>
                  <Input value={form.employer_name} onChange={e => setForm({ ...form, employer_name: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>NOC Code</Label>
                  <Input value={form.noc_code} onChange={e => setForm({ ...form, noc_code: e.target.value })} placeholder="e.g., 21232" />
                </div>
                <div className="space-y-2">
                  <Label>TEER Category</Label>
                  <Select value={form.teer_category || "__none"} onValueChange={v => setForm({ ...form, teer_category: v === "__none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Not specified</SelectItem>
                      {Object.entries(TEER_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} disabled={form.is_current} />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.is_current} onChange={e => setForm({ ...form, is_current: e.target.checked, end_date: e.target.checked ? "" : form.end_date })} className="rounded" />
                  Currently working here
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.is_canadian_experience} onChange={e => setForm({ ...form, is_canadian_experience: e.target.checked })} className="rounded" />
                  Canadian experience
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Province</Label>
                  <Select value={form.province || "__none"} onValueChange={v => setForm({ ...form, province: v === "__none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Not specified</SelectItem>
                      {PROVINCES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Hours/Week</Label>
                  <Input type="number" value={form.hours_per_week} onChange={e => setForm({ ...form, hours_per_week: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Duties</Label>
                <Textarea value={form.duties} onChange={e => setForm({ ...form, duties: e.target.value })} placeholder="Describe your main job duties..." />
              </div>
              <Button onClick={handleAdd} disabled={saving || !form.job_title || !form.start_date} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Experience
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {workHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No work history added yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workHistory.map((w) => (
              <div key={w.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{w.job_title}</p>
                    {w.is_canadian_experience && <Badge variant="success">Canadian</Badge>}
                    {w.is_current && <Badge variant="default">Current</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {w.employer_name} · {formatDate(w.start_date)} — {w.is_current ? "Present" : w.end_date ? formatDate(w.end_date) : ""}
                  </p>
                  {w.noc_code && <p className="text-xs text-muted-foreground mt-1">NOC: {w.noc_code} · {w.teer_category ? TEER_LABELS[w.teer_category] : ""}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(w.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EducationTab({ educationHistory, profileId, refetch }: { educationHistory: any[]; profileId: string; refetch: () => void }) {
  const defaultForm = {
    institution_name: "", program_name: "", credential_type: "bachelors",
    field_of_study: "", is_canadian: true, province: "",
    start_date: "", end_date: "", graduated: false, graduation_date: "",
    eca_completed: false,
  };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    setSaving(true);
    const supabase = createClient();
    const data = sanitizeForDB({ ...form, user_id: profileId });
    const { error } = await supabase.from("education_history").insert(data);
    if (error) {
      console.error("Failed to add education:", error);
      setSaving(false);
      return;
    }
    setOpen(false);
    setForm(defaultForm);
    await refetch();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("education_history").delete().eq("id", id);
    await refetch();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Education History</CardTitle>
          <CardDescription>Canadian education and ECA-assessed foreign credentials count for CRS.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" /> Add Education</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Education</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Institution Name</Label>
                <Input value={form.institution_name} onChange={e => setForm({ ...form, institution_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Program Name</Label>
                <Input value={form.program_name} onChange={e => setForm({ ...form, program_name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Credential Type</Label>
                  <Select value={form.credential_type} onValueChange={v => setForm({ ...form, credential_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high_school">High School</SelectItem>
                      <SelectItem value="certificate">Certificate</SelectItem>
                      <SelectItem value="diploma">Diploma</SelectItem>
                      <SelectItem value="bachelors">Bachelor&apos;s Degree</SelectItem>
                      <SelectItem value="postgrad_diploma">Post-Grad Diploma</SelectItem>
                      <SelectItem value="masters">Master&apos;s Degree</SelectItem>
                      <SelectItem value="doctoral">Doctoral Degree</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Field of Study</Label>
                  <Input value={form.field_of_study} onChange={e => setForm({ ...form, field_of_study: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              {form.is_canadian && (
                <div className="space-y-2">
                  <Label>Province</Label>
                  <Select value={form.province || "__none"} onValueChange={v => setForm({ ...form, province: v === "__none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Not specified</SelectItem>
                      {PROVINCES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.is_canadian} onChange={e => setForm({ ...form, is_canadian: e.target.checked })} className="rounded" />
                  Canadian institution
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.graduated} onChange={e => setForm({ ...form, graduated: e.target.checked })} className="rounded" />
                  Graduated
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.eca_completed} onChange={e => setForm({ ...form, eca_completed: e.target.checked })} className="rounded" />
                  ECA done
                </label>
              </div>
              <Button onClick={handleAdd} disabled={saving || !form.institution_name || !form.start_date} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Education
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {educationHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No education added yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {educationHistory.map((e) => (
              <div key={e.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{e.program_name}</p>
                    {e.is_canadian && <Badge variant="success">Canadian</Badge>}
                    {e.eca_completed && <Badge variant="default">ECA</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{e.institution_name}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LanguageTab({ languageTests, profileId, refetch }: { languageTests: any[]; profileId: string; refetch: () => void }) {
  const [form, setForm] = useState({
    test_type: "ielts_general", test_date: "", expiry_date: "",
    listening_score: "", reading_score: "", writing_score: "", speaking_score: "",
    overall_score: "", clb_listening: "", clb_reading: "", clb_writing: "", clb_speaking: "",
  });
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    setSaving(true);
    const supabase = createClient();
    const data = {
      ...form, user_id: profileId,
      listening_score: parseFloat(form.listening_score) || null,
      reading_score: parseFloat(form.reading_score) || null,
      writing_score: parseFloat(form.writing_score) || null,
      speaking_score: parseFloat(form.speaking_score) || null,
      overall_score: parseFloat(form.overall_score) || null,
      clb_listening: parseInt(form.clb_listening) || null,
      clb_reading: parseInt(form.clb_reading) || null,
      clb_writing: parseInt(form.clb_writing) || null,
      clb_speaking: parseInt(form.clb_speaking) || null,
    };
    await supabase.from("language_tests").insert(data);
    setForm({
      test_type: "ielts_general", test_date: "", expiry_date: "",
      listening_score: "", reading_score: "", writing_score: "", speaking_score: "",
      overall_score: "", clb_listening: "", clb_reading: "", clb_writing: "", clb_speaking: "",
    });
    await refetch();
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Language Tests</CardTitle>
        <CardDescription>IELTS/CELPIP results are valid for 2 years from test date.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {languageTests.map((t) => (
          <div key={t.id} className="p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <p className="font-medium">{t.test_type.toUpperCase().replace("_", " ")}</p>
              <Badge variant={new Date(t.expiry_date) > new Date() ? "success" : "danger"}>
                {new Date(t.expiry_date) > new Date() ? "Valid" : "Expired"}
              </Badge>
            </div>
            <div className="grid grid-cols-4 gap-3 mt-3">
              <div className="text-center p-2 bg-muted rounded">
                <p className="text-xs text-muted-foreground">L</p>
                <p className="font-semibold">{t.listening_score}</p>
                {t.clb_listening && <p className="text-xs text-muted-foreground">CLB {t.clb_listening}</p>}
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <p className="text-xs text-muted-foreground">R</p>
                <p className="font-semibold">{t.reading_score}</p>
                {t.clb_reading && <p className="text-xs text-muted-foreground">CLB {t.clb_reading}</p>}
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <p className="text-xs text-muted-foreground">W</p>
                <p className="font-semibold">{t.writing_score}</p>
                {t.clb_writing && <p className="text-xs text-muted-foreground">CLB {t.clb_writing}</p>}
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <p className="text-xs text-muted-foreground">S</p>
                <p className="font-semibold">{t.speaking_score}</p>
                {t.clb_speaking && <p className="text-xs text-muted-foreground">CLB {t.clb_speaking}</p>}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Expires: {formatDate(t.expiry_date)}</p>
          </div>
        ))}
        <div className="border-t pt-4 space-y-3">
          <p className="font-medium text-sm">Add Language Test</p>
          <div className="space-y-3">
            <Select value={form.test_type} onValueChange={v => setForm({ ...form, test_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ielts_general">IELTS General</SelectItem>
                <SelectItem value="ielts_academic">IELTS Academic</SelectItem>
                <SelectItem value="celpip">CELPIP</SelectItem>
                <SelectItem value="tef">TEF</SelectItem>
                <SelectItem value="tcf">TCF</SelectItem>
                <SelectItem value="pte_core">PTE Core</SelectItem>
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Test Date</Label>
                <Input type="date" value={form.test_date} onChange={e => setForm({ ...form, test_date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Expiry Date</Label>
                <Input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Listening</Label>
                <Input value={form.listening_score} onChange={e => setForm({ ...form, listening_score: e.target.value })} placeholder="Score" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reading</Label>
                <Input value={form.reading_score} onChange={e => setForm({ ...form, reading_score: e.target.value })} placeholder="Score" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Writing</Label>
                <Input value={form.writing_score} onChange={e => setForm({ ...form, writing_score: e.target.value })} placeholder="Score" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Speaking</Label>
                <Input value={form.speaking_score} onChange={e => setForm({ ...form, speaking_score: e.target.value })} placeholder="Score" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">CLB L</Label>
                <Input value={form.clb_listening} onChange={e => setForm({ ...form, clb_listening: e.target.value })} placeholder="CLB" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CLB R</Label>
                <Input value={form.clb_reading} onChange={e => setForm({ ...form, clb_reading: e.target.value })} placeholder="CLB" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CLB W</Label>
                <Input value={form.clb_writing} onChange={e => setForm({ ...form, clb_writing: e.target.value })} placeholder="CLB" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CLB S</Label>
                <Input value={form.clb_speaking} onChange={e => setForm({ ...form, clb_speaking: e.target.value })} placeholder="CLB" />
              </div>
            </div>
            <Button onClick={handleAdd} disabled={saving || !form.test_date || !form.expiry_date} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Test Results
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PRApplicationTab({ prApplications, profile, profileId, refetch }: { prApplications: any[]; profile: any; profileId: string; refetch: () => void }) {
  const [open, setOpen] = useState(false);
  const defaultForm = {
    program: "cec",
    application_number: "",
    submission_date: "",
    aor_date: "",
    biometrics_date: "",
    biometrics_done: false,
    medical_exam_date: "",
    medical_passed: false,
    background_check_started: "",
    additional_docs_requested: false,
    gcms_notes_ordered: false,
    ita_date: "",
    ita_crs_score: "",
    noc_code_applied: "",
    province_applied: "",
    pnp_stream: "",
    current_stage: "submitted",
    notes: "",
  };
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleAdd() {
    setSaving(true);
    const supabase = createClient();
    const data = sanitizeForDB({
      ...form,
      user_id: profileId,
      ita_crs_score: form.ita_crs_score ? parseInt(form.ita_crs_score) : null,
    });
    if (editingId) {
      await supabase.from("pr_applications").update(data).eq("id", editingId);
    } else {
      await supabase.from("pr_applications").insert(data);
    }
    if (!profile?.has_applied_pr) {
      await supabase.from("profiles").update({ has_applied_pr: true, pr_application_program: form.program }).eq("id", profileId);
    }
    setOpen(false);
    setEditingId(null);
    setForm(defaultForm);
    await refetch();
    setSaving(false);
  }

  function handleEdit(app: any) {
    setEditingId(app.id);
    setForm({
      program: app.program || "cec",
      application_number: app.application_number || "",
      submission_date: app.submission_date || "",
      aor_date: app.aor_date || "",
      biometrics_date: app.biometrics_date || "",
      biometrics_done: app.biometrics_done || false,
      medical_exam_date: app.medical_exam_date || "",
      medical_passed: app.medical_passed || false,
      background_check_started: app.background_check_started || "",
      additional_docs_requested: app.additional_docs_requested || false,
      gcms_notes_ordered: app.gcms_notes_ordered || false,
      ita_date: app.ita_date || "",
      ita_crs_score: app.ita_crs_score?.toString() || "",
      noc_code_applied: app.noc_code_applied || "",
      province_applied: app.province_applied || "",
      pnp_stream: app.pnp_stream || "",
      current_stage: app.current_stage || "submitted",
      notes: app.notes || "",
    });
    setOpen(true);
  }

  const PR_STAGES = [
    { value: "profile_created", label: "EE Profile Created" },
    { value: "ita_received", label: "ITA Received" },
    { value: "submitted", label: "Application Submitted" },
    { value: "aor_received", label: "AOR Received" },
    { value: "biometrics_requested", label: "Biometrics Requested" },
    { value: "medical_requested", label: "Medical Exam Requested" },
    { value: "background_check", label: "Background Check" },
    { value: "additional_docs", label: "Additional Docs Requested" },
    { value: "decision_made", label: "Decision Made" },
    { value: "approved", label: "Approved (COPR)" },
    { value: "refused", label: "Refused" },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>PR Application</CardTitle>
          <CardDescription>Track your permanent residency application progress and milestones.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingId(null); setForm(defaultForm); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" /> {prApplications.length > 0 ? "Add Another" : "Add Application"}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? "Update PR Application" : "Add PR Application"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Program</Label>
                  <Select value={form.program} onValueChange={v => setForm({ ...form, program: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cec">Canadian Experience Class</SelectItem>
                      <SelectItem value="fsw">Federal Skilled Worker</SelectItem>
                      <SelectItem value="fst">Federal Skilled Trades</SelectItem>
                      <SelectItem value="pnp">PNP (non-EE)</SelectItem>
                      <SelectItem value="pnp_ee">PNP (Express Entry)</SelectItem>
                      <SelectItem value="atlantic">Atlantic Immigration</SelectItem>
                      <SelectItem value="rural">Rural & Northern</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Current Stage</Label>
                  <Select value={form.current_stage} onValueChange={v => setForm({ ...form, current_stage: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PR_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Application Number</Label>
                  <Input value={form.application_number} onChange={e => setForm({ ...form, application_number: e.target.value })} placeholder="e.g., E001234567" />
                </div>
                <div className="space-y-2">
                  <Label>NOC Code Applied</Label>
                  <Input value={form.noc_code_applied} onChange={e => setForm({ ...form, noc_code_applied: e.target.value })} placeholder="e.g., 21232" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ITA Date</Label>
                  <Input type="date" value={form.ita_date} onChange={e => setForm({ ...form, ita_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>ITA CRS Score</Label>
                  <Input type="number" value={form.ita_crs_score} onChange={e => setForm({ ...form, ita_crs_score: e.target.value })} placeholder="e.g., 490" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Submission Date</Label>
                  <Input type="date" value={form.submission_date} onChange={e => setForm({ ...form, submission_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>AOR Date</Label>
                  <Input type="date" value={form.aor_date} onChange={e => setForm({ ...form, aor_date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Biometrics Date</Label>
                  <Input type="date" value={form.biometrics_date} onChange={e => setForm({ ...form, biometrics_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Medical Exam Date</Label>
                  <Input type="date" value={form.medical_exam_date} onChange={e => setForm({ ...form, medical_exam_date: e.target.value })} />
                </div>
              </div>
              {(form.program === "pnp" || form.program === "pnp_ee") && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Province Applied</Label>
                    <Select value={form.province_applied || "__none"} onValueChange={v => setForm({ ...form, province_applied: v === "__none" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Not specified</SelectItem>
                        {PROVINCES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>PNP Stream</Label>
                    <Input value={form.pnp_stream} onChange={e => setForm({ ...form, pnp_stream: e.target.value })} placeholder="e.g., OINP Human Capital" />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.biometrics_done} onChange={e => setForm({ ...form, biometrics_done: e.target.checked })} className="rounded" />
                  Biometrics done
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.medical_passed} onChange={e => setForm({ ...form, medical_passed: e.target.checked })} className="rounded" />
                  Medical passed
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.additional_docs_requested} onChange={e => setForm({ ...form, additional_docs_requested: e.target.checked })} className="rounded" />
                  Additional docs requested
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.gcms_notes_ordered} onChange={e => setForm({ ...form, gcms_notes_ordered: e.target.checked })} className="rounded" />
                  GCMS notes ordered
                </label>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any details about your application..." />
              </div>
              <Button onClick={handleAdd} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editingId ? "Update Application" : "Add Application"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {prApplications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileCheck className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No PR application tracked yet.</p>
            <p className="text-sm mt-1">Add your PR application to track progress, get draw updates, and monitor processing times.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {prApplications.map((app) => {
              const stages = PR_STAGES;
              const currentIdx = stages.findIndex(s => s.value === app.current_stage);
              const progress = currentIdx >= 0 ? Math.round(((currentIdx + 1) / stages.length) * 100) : 0;

              return (
                <div key={app.id} className="p-4 rounded-lg border space-y-3 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleEdit(app)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{prProgramLabel(app.program)}</p>
                      <Badge variant={
                        app.current_stage === "approved" ? "success" :
                        app.current_stage === "refused" ? "danger" : "warning"
                      }>
                        {prStageLabel(app.current_stage)}
                      </Badge>
                    </div>
                    {app.application_number && <span className="text-xs text-muted-foreground font-mono">{app.application_number}</span>}
                  </div>

                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                    {app.ita_date && <span>ITA: {formatDate(app.ita_date)}</span>}
                    {app.submission_date && <span>Submitted: {formatDate(app.submission_date)}</span>}
                    {app.aor_date && <span>AOR: {formatDate(app.aor_date)}</span>}
                    {app.ita_crs_score && <span>CRS: {app.ita_crs_score}</span>}
                    {app.biometrics_done && <span>Biometrics: Done</span>}
                    {app.medical_passed && <span>Medical: Passed</span>}
                    {app.noc_code_applied && <span>NOC: {app.noc_code_applied}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
