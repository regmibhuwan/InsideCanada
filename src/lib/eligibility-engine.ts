import type { UserCase, EligibilityResult } from "./types";
import { differenceInDays, parseISO } from "date-fns";
import { CLB_IELTS_MAPPING } from "./constants";

function ieltsScoreToCLB(score: number): number {
  const clbLevels = Object.keys(CLB_IELTS_MAPPING)
    .map(Number)
    .sort((a, b) => b - a);
  for (const clb of clbLevels) {
    if (score >= CLB_IELTS_MAPPING[clb].listening) return clb;
  }
  return 0;
}

function deriveClbFromScores(test: {
  test_type: string;
  listening_score?: number | null;
  reading_score?: number | null;
  writing_score?: number | null;
  speaking_score?: number | null;
}): number[] {
  if (!test.listening_score || !test.reading_score || !test.writing_score || !test.speaking_score) return [];
  const isIelts = test.test_type?.includes("ielts") || test.test_type?.includes("general") || test.test_type?.includes("academic");
  if (!isIelts) return [];

  const clbLevels = Object.keys(CLB_IELTS_MAPPING).map(Number).sort((a, b) => b - a);

  function scoreToClb(score: number, skill: "listening" | "reading" | "writing" | "speaking"): number {
    for (const clb of clbLevels) {
      if (score >= CLB_IELTS_MAPPING[clb][skill]) return clb;
    }
    return 0;
  }

  return [
    scoreToClb(test.listening_score, "listening"),
    scoreToClb(test.reading_score, "reading"),
    scoreToClb(test.writing_score, "writing"),
    scoreToClb(test.speaking_score, "speaking"),
  ];
}

function getMinCLB(userCase: UserCase): number {
  if (!userCase.languageTests.length) return 0;
  const latest = userCase.languageTests
    .filter(t => differenceInDays(parseISO(t.expiry_date), new Date()) > 0)
    .sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime())[0];
  if (!latest) return 0;

  const clbs = [latest.clb_listening, latest.clb_reading, latest.clb_writing, latest.clb_speaking].filter(Boolean) as number[];
  if (clbs.length >= 4) return Math.min(...clbs);

  const derived = deriveClbFromScores(latest);
  if (derived.length === 4) return Math.min(...derived);

  if (clbs.length > 0) return Math.min(...clbs);
  return 0;
}

function getCanadianExperienceMonths(userCase: UserCase): number {
  let totalDays = 0;
  for (const job of userCase.workHistory) {
    if (!job.is_canadian_experience) continue;
    const start = parseISO(job.start_date);
    const end = job.is_current ? new Date() : job.end_date ? parseISO(job.end_date) : new Date();
    totalDays += differenceInDays(end, start);
  }
  return Math.floor(totalDays / 30);
}

function getHighestTEER(userCase: UserCase): string | null {
  const teerValues = userCase.workHistory
    .filter(w => w.teer_category && w.is_canadian_experience)
    .map(w => parseInt(w.teer_category!));
  if (!teerValues.length) return null;
  return Math.min(...teerValues).toString();
}

function hasValidLanguageTest(userCase: UserCase): boolean {
  return userCase.languageTests.some(
    t => differenceInDays(parseISO(t.expiry_date), new Date()) > 0
  );
}

export function checkCECEligibility(userCase: UserCase): EligibilityResult {
  const missing: string[] = [];
  const recs: string[] = [];
  const months = getCanadianExperienceMonths(userCase);
  const clb = getMinCLB(userCase);
  const teer = getHighestTEER(userCase);

  if (months < 12) {
    missing.push(`Need 12 months Canadian experience (you have ${months})`);
    if (months >= 8) recs.push(`You're ${12 - months} months away from eligibility. Keep working in your current role.`);
  }
  if (!hasValidLanguageTest(userCase)) {
    missing.push("Valid language test results required (IELTS General or CELPIP)");
    recs.push("Book your language test as soon as possible — results take 2-3 weeks.");
  } else if (clb < 7 && teer && ["0", "1"].includes(teer)) {
    missing.push(`CLB 7 required for TEER 0/1 occupations (your minimum CLB is ${clb})`);
    recs.push("Consider retaking your language test to improve your CLB score.");
  } else if (clb < 5 && teer && ["2", "3"].includes(teer)) {
    missing.push(`CLB 5 required for TEER 2/3 occupations (your minimum CLB is ${clb})`);
  }
  if (!teer || !["0", "1", "2", "3"].includes(teer)) {
    missing.push("Must have worked in a TEER 0, 1, 2, or 3 occupation");
    recs.push("Verify your NOC code and TEER category for your Canadian work experience.");
  }

  const eligible = missing.length === 0;
  if (eligible) recs.push("You appear eligible for CEC. Create your Express Entry profile on IRCC.");

  return {
    program: "Canadian Experience Class (CEC)",
    eligible,
    missingRequirements: missing,
    recommendations: recs,
    confidence: eligible ? "high" : months >= 10 ? "medium" : "low",
  };
}

export function checkFSWEligibility(userCase: UserCase): EligibilityResult {
  const missing: string[] = [];
  const recs: string[] = [];
  const clb = getMinCLB(userCase);
  const hasECA = userCase.educationHistory.some(e => e.eca_completed || e.is_canadian);

  if (!hasValidLanguageTest(userCase)) {
    missing.push("Valid language test results required");
  } else if (clb < 7) {
    missing.push(`CLB 7 required (your minimum CLB is ${clb})`);
  }
  if (!hasECA) {
    missing.push("Educational Credential Assessment (ECA) required for foreign credentials");
    recs.push("Apply for an ECA through WES, IQAS, or another designated organization.");
  }

  const eligible = missing.length === 0;
  if (eligible) recs.push("You may be eligible for FSW. Calculate your 67-point grid score next.");

  return {
    program: "Federal Skilled Worker (FSW)",
    eligible,
    missingRequirements: missing,
    recommendations: recs,
    confidence: eligible ? "medium" : "low",
  };
}

export function checkPNPEligibility(userCase: UserCase): EligibilityResult {
  const missing: string[] = [];
  const recs: string[] = [];
  const clb = getMinCLB(userCase);
  const months = getCanadianExperienceMonths(userCase);
  const province = userCase.profile.current_province;

  if (clb < 4) {
    missing.push("Most PNP streams require minimum CLB 4");
  }
  if (!province) {
    missing.push("Set your current province to check PNP eligibility");
    recs.push("Update your profile with your current province of residence.");
  }

  const eligible = missing.length === 0;
  if (eligible) {
    recs.push(`Explore ${province || "your province's"} PNP streams. Many have specific occupation or experience requirements.`);
    if (months >= 6) recs.push("Your Canadian experience may qualify you for enhanced PNP streams.");
  }

  return {
    program: "Provincial Nominee Program (PNP)",
    eligible,
    missingRequirements: missing,
    recommendations: recs,
    confidence: "medium",
  };
}

export function runEligibilityCheck(userCase: UserCase): EligibilityResult[] {
  return [
    checkCECEligibility(userCase),
    checkFSWEligibility(userCase),
    checkPNPEligibility(userCase),
  ];
}
