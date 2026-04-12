"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserCase, Profile, Permit, Passport, LanguageTest, WorkHistory, EducationHistory, Document, Milestone, RiskAlert, PRApplication } from "./types";

const emptyCase: UserCase = {
  profile: null as unknown as Profile,
  permits: [],
  passports: [],
  languageTests: [],
  workHistory: [],
  educationHistory: [],
  documents: [],
  milestones: [],
  riskAlerts: [],
  prApplications: [],
};

export function useCase() {
  const [userCase, setUserCase] = useState<UserCase>(emptyCase);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCase = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const [
      { data: profile },
      { data: permits },
      { data: passports },
      { data: languageTests },
      { data: workHistory },
      { data: educationHistory },
      { data: documents },
      { data: milestones },
      { data: riskAlerts },
      { data: prApplications },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("permits").select("*").eq("user_id", user.id).order("expiry_date", { ascending: true }),
      supabase.from("passports").select("*").eq("user_id", user.id),
      supabase.from("language_tests").select("*").eq("user_id", user.id).order("test_date", { ascending: false }),
      supabase.from("work_history").select("*").eq("user_id", user.id).order("start_date", { ascending: false }),
      supabase.from("education_history").select("*").eq("user_id", user.id).order("start_date", { ascending: false }),
      supabase.from("documents").select("*").eq("user_id", user.id).order("uploaded_at", { ascending: false }),
      supabase.from("milestones").select("*").eq("user_id", user.id).order("sort_order", { ascending: true }),
      supabase.from("risk_alerts").select("*").eq("user_id", user.id).eq("is_dismissed", false).order("created_at", { ascending: false }),
      supabase.from("pr_applications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    setUserCase({
      profile: profile as Profile,
      permits: (permits || []) as Permit[],
      passports: (passports || []) as Passport[],
      languageTests: (languageTests || []) as LanguageTest[],
      workHistory: (workHistory || []) as WorkHistory[],
      educationHistory: (educationHistory || []) as EducationHistory[],
      documents: (documents || []) as Document[],
      milestones: (milestones || []) as Milestone[],
      riskAlerts: (riskAlerts || []) as RiskAlert[],
      prApplications: (prApplications || []) as PRApplication[],
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  return { userCase, loading, error, refetch: fetchCase };
}
