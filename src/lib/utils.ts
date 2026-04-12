import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInDays, format, parseISO, isPast, addDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function daysUntil(dateStr: string): number {
  return differenceInDays(parseISO(dateStr), new Date());
}

export function isExpired(dateStr: string): boolean {
  return isPast(parseISO(dateStr));
}

export function isExpiringSoon(dateStr: string, withinDays = 90): boolean {
  const days = daysUntil(dateStr);
  return days >= 0 && days <= withinDays;
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "MMM d, yyyy");
}

export function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), "MMM yyyy");
}

export function urgencyColor(days: number): string {
  if (days < 0) return "text-red-700 bg-red-50 border-red-200";
  if (days <= 30) return "text-red-600 bg-red-50 border-red-200";
  if (days <= 90) return "text-amber-600 bg-amber-50 border-amber-200";
  if (days <= 180) return "text-yellow-600 bg-yellow-50 border-yellow-200";
  return "text-green-600 bg-green-50 border-green-200";
}

export function severityColor(severity: string): string {
  switch (severity) {
    case "critical": return "text-red-700 bg-red-50 border-red-300";
    case "high": return "text-orange-700 bg-orange-50 border-orange-300";
    case "medium": return "text-amber-700 bg-amber-50 border-amber-300";
    case "low": return "text-blue-700 bg-blue-50 border-blue-300";
    default: return "text-gray-700 bg-gray-50 border-gray-300";
  }
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pgwp_holder: "PGWP Holder",
    student_visa: "Study Permit",
    work_permit: "Work Permit",
    maintained_status: "Maintained Status",
    pr_applicant: "PR Applicant",
    pr_holder: "Permanent Resident",
    citizen: "Citizen",
    visitor: "Visitor",
    bridging_open_wp: "Bridging Open Work Permit",
  };
  return labels[status] || status;
}

export function permitLabel(type: string): string {
  const labels: Record<string, string> = {
    pgwp: "Post-Graduation Work Permit",
    closed_work_permit: "Closed Work Permit",
    open_work_permit: "Open Work Permit",
    study_permit: "Study Permit",
    visitor_record: "Visitor Record",
    bridging_open_wp: "Bridging Open Work Permit",
    lmia_work_permit: "LMIA Work Permit",
    trv: "Temporary Resident Visa",
  };
  return labels[type] || type;
}

export function documentLabel(type: string): string {
  const labels: Record<string, string> = {
    passport: "Passport",
    work_permit: "Work Permit",
    study_permit: "Study Permit",
    ielts_result: "IELTS Result",
    celpip_result: "CELPIP Result",
    employment_letter: "Employment Letter",
    pay_stub: "Pay Stub",
    tax_return: "Tax Return (T4)",
    noa: "Notice of Assessment",
    eca_report: "ECA Report",
    police_clearance: "Police Clearance",
    medical_exam: "Medical Exam (IMM 1017)",
    photo: "Passport Photo",
    birth_certificate: "Birth Certificate",
    marriage_certificate: "Marriage Certificate",
    proof_of_funds: "Proof of Funds",
    reference_letter: "Reference Letter",
    job_offer_letter: "Job Offer Letter",
    lmia: "LMIA",
    provincial_nomination: "Provincial Nomination",
    other: "Other",
  };
  return labels[type] || type;
}

export function getDeadlineDate(dateStr: string) {
  const date = parseISO(dateStr);
  const days = differenceInDays(date, new Date());
  return { date, days, formatted: format(date, "MMM d, yyyy") };
}

export function calculateCanadianExperienceMonths(
  workHistory: { start_date: string; end_date?: string; is_current: boolean; is_canadian_experience: boolean }[]
): number {
  let totalDays = 0;
  const canadianJobs = workHistory.filter(w => w.is_canadian_experience);
  for (const job of canadianJobs) {
    const start = parseISO(job.start_date);
    const end = job.is_current ? new Date() : job.end_date ? parseISO(job.end_date) : new Date();
    totalDays += differenceInDays(end, start);
  }
  return Math.floor(totalDays / 30);
}

export function getNextActionDate(): string {
  return format(addDays(new Date(), 1), "yyyy-MM-dd");
}

export function sanitizeForDB<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key in result) {
    if (result[key] === "") {
      (result as Record<string, unknown>)[key] = null;
    }
  }
  return result;
}

export function prStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    profile_created: "Express Entry Profile Created",
    ita_received: "ITA Received",
    submitted: "Application Submitted",
    aor_received: "Acknowledgement of Receipt",
    biometrics_requested: "Biometrics Requested",
    medical_requested: "Medical Exam Requested",
    background_check: "Background Check in Progress",
    additional_docs: "Additional Documents Requested",
    decision_made: "Decision Made",
    approved: "Approved (COPR)",
    refused: "Refused",
    withdrawn: "Withdrawn",
  };
  return labels[stage] || stage;
}

export function prProgramLabel(program: string): string {
  const labels: Record<string, string> = {
    cec: "Canadian Experience Class",
    fsw: "Federal Skilled Worker",
    fst: "Federal Skilled Trades",
    pnp: "Provincial Nominee Program",
    pnp_ee: "PNP Express Entry",
    sponsorship: "Family Sponsorship",
    atlantic: "Atlantic Immigration Program",
    rural: "Rural & Northern Immigration",
    other: "Other",
  };
  return labels[program] || program;
}
