export const PROVINCES = [
  { value: "AB", label: "Alberta" },
  { value: "BC", label: "British Columbia" },
  { value: "MB", label: "Manitoba" },
  { value: "NB", label: "New Brunswick" },
  { value: "NL", label: "Newfoundland and Labrador" },
  { value: "NS", label: "Nova Scotia" },
  { value: "NT", label: "Northwest Territories" },
  { value: "NU", label: "Nunavut" },
  { value: "ON", label: "Ontario" },
  { value: "PE", label: "Prince Edward Island" },
  { value: "QC", label: "Quebec" },
  { value: "SK", label: "Saskatchewan" },
  { value: "YT", label: "Yukon" },
] as const;

export const PR_PATHWAYS = [
  {
    id: "cec",
    name: "Canadian Experience Class (CEC)",
    description: "For skilled workers with Canadian work experience",
    requirements: {
      minCanadianExperienceMonths: 12,
      minCLB: 7,
      teerCategories: ["0", "1", "2", "3"],
    },
  },
  {
    id: "fsw",
    name: "Federal Skilled Worker (FSW)",
    description: "For skilled workers with foreign work experience",
    requirements: {
      minCLB: 7,
      minEducation: "bachelors",
      minPoints: 67,
    },
  },
  {
    id: "pnp",
    name: "Provincial Nominee Program (PNP)",
    description: "Nomination from a Canadian province or territory",
    requirements: {
      minCLB: 4,
      provinceSpecific: true,
    },
  },
  {
    id: "fst",
    name: "Federal Skilled Trades (FST)",
    description: "For qualified tradespeople",
    requirements: {
      minCLB: 5,
      teerCategories: ["2", "3"],
      minCanadianExperienceMonths: 24,
    },
  },
] as const;

export const DOCUMENT_CHECKLIST = {
  pr_application: [
    { type: "passport", label: "Valid Passport", required: true },
    { type: "ielts_result", label: "Language Test Results (IELTS/CELPIP)", required: true },
    { type: "eca_report", label: "Educational Credential Assessment (ECA)", required: true },
    { type: "employment_letter", label: "Employment Reference Letters", required: true },
    { type: "pay_stub", label: "Recent Pay Stubs", required: true },
    { type: "tax_return", label: "Tax Returns (T4/T1)", required: true },
    { type: "noa", label: "Notice of Assessment (NOA)", required: true },
    { type: "police_clearance", label: "Police Clearance Certificate", required: true },
    { type: "medical_exam", label: "Immigration Medical Exam", required: true },
    { type: "photo", label: "Passport-size Photos", required: true },
    { type: "proof_of_funds", label: "Proof of Settlement Funds", required: false },
    { type: "birth_certificate", label: "Birth Certificate", required: true },
    { type: "work_permit", label: "Current Work Permit Copy", required: true },
  ],
  work_permit_extension: [
    { type: "passport", label: "Valid Passport", required: true },
    { type: "work_permit", label: "Current Work Permit", required: true },
    { type: "employment_letter", label: "Employer Support Letter", required: true },
    { type: "job_offer_letter", label: "Job Offer Letter", required: true },
    { type: "lmia", label: "LMIA (if applicable)", required: false },
    { type: "pay_stub", label: "Recent Pay Stubs", required: true },
  ],
} as const;

export const CLB_IELTS_MAPPING: Record<number, { listening: number; reading: number; writing: number; speaking: number }> = {
  10: { listening: 8.5, reading: 8.0, writing: 7.5, speaking: 7.5 },
  9: { listening: 8.0, reading: 7.0, writing: 7.0, speaking: 7.0 },
  8: { listening: 7.5, reading: 6.5, writing: 6.5, speaking: 6.5 },
  7: { listening: 6.0, reading: 6.0, writing: 6.0, speaking: 6.0 },
  6: { listening: 5.5, reading: 5.0, writing: 5.5, speaking: 5.5 },
  5: { listening: 5.0, reading: 4.0, writing: 5.0, speaking: 5.0 },
  4: { listening: 4.5, reading: 3.5, writing: 4.0, speaking: 4.0 },
};

export const TEER_LABELS: Record<string, string> = {
  "0": "TEER 0 — Management",
  "1": "TEER 1 — Professional (university degree)",
  "2": "TEER 2 — Technical (college/apprenticeship)",
  "3": "TEER 3 — Intermediate (high school + training)",
  "4": "TEER 4 — Entry-level (on-the-job training)",
  "5": "TEER 5 — Labour (minimal training)",
};
