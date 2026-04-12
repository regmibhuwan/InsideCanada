export interface ChecklistItem {
  key: string;
  label: string;
  description: string;
  required: boolean;
}

export interface StreamChecklist {
  stream: string;
  label: string;
  description: string;
  stage: "provincial" | "federal" | "single";
  items: ChecklistItem[];
}

export type ApplicationStage =
  | "pre_application"
  | "provincial_applied"
  | "nominated"
  | "federal_applied"
  | "waiting_decision";

// Common document sets reused across streams
const COMMON_FEDERAL: ChecklistItem[] = [
  { key: "passport", label: "Valid Passport", description: "Must be valid for at least 6 months beyond planned travel date", required: true },
  { key: "photos", label: "Passport-size Photos", description: "2 photos meeting IRCC specifications", required: true },
  { key: "digital_photo", label: "Digital Photo for E-Application", description: "JPEG format meeting IRCC specifications", required: true },
  { key: "police_clearance", label: "Police Clearance Certificate", description: "From every country you lived in 6+ months since age 18", required: true },
  { key: "medical_exam", label: "Immigration Medical Exam (IME)", description: "Must be done by an IRCC-designated panel physician", required: true },
  { key: "birth_certificate", label: "Birth Certificate", description: "Original or certified copy with English/French translation if needed", required: true },
];

const LANGUAGE_TEST: ChecklistItem = {
  key: "language_test", label: "Language Test Results (IELTS / CELPIP / PTE Core / TEF / TCF)",
  description: "Must be less than 2 years old. CLB requirements vary by stream.", required: true,
};

const EMPLOYMENT_LETTERS: ChecklistItem = {
  key: "employment_letters", label: "Employment Reference Letters",
  description: "On company letterhead: job title, duties, hours/week, salary, dates of employment", required: true,
};

const ECA: ChecklistItem = {
  key: "eca_report", label: "Educational Credential Assessment (ECA)",
  description: "From WES, IQAS, or other designated organization. Must be less than 5 years old.", required: true,
};

const PROOF_OF_FUNDS: ChecklistItem = {
  key: "proof_of_funds", label: "Proof of Settlement Funds",
  description: "Bank statements showing minimum required funds (6+ months)", required: true,
};

const EDUCATION_DOCS: ChecklistItem = {
  key: "education_docs", label: "Education Documents (Degrees, Transcripts)",
  description: "Original certificates and transcripts with translations if needed", required: true,
};

// ====================
// FEDERAL PR STREAMS
// ====================

const CEC_CHECKLIST: StreamChecklist = {
  stream: "cec",
  label: "Canadian Experience Class (CEC)",
  description: "For skilled workers with at least 12 months of Canadian work experience in TEER 0, 1, 2, or 3.",
  stage: "single",
  items: [
    ...COMMON_FEDERAL,
    LANGUAGE_TEST,
    EMPLOYMENT_LETTERS,
    { key: "pay_stubs", label: "Recent Pay Stubs (3-6 months)", description: "Proves employment continuity and wage", required: true },
    { key: "t4_tax", label: "T4 Slips & Notice of Assessment (NOA)", description: "From CRA for each year you worked in Canada", required: true },
    { key: "work_permit_copy", label: "Current/Previous Work Permit Copies", description: "All work permits issued to you in Canada", required: true },
    { key: "proof_of_funds_cec", label: "Proof of Settlement Funds", description: "Not required if currently working in Canada with valid job offer", required: false },
  ],
};

const FSW_CHECKLIST: StreamChecklist = {
  stream: "fsw",
  label: "Federal Skilled Worker (FSW)",
  description: "For skilled workers with foreign work experience. Must score 67+ on the FSW points grid.",
  stage: "single",
  items: [
    ...COMMON_FEDERAL,
    LANGUAGE_TEST,
    ECA,
    EMPLOYMENT_LETTERS,
    PROOF_OF_FUNDS,
    EDUCATION_DOCS,
    { key: "second_language", label: "Second Language Test (French TEF/TCF)", description: "Optional but adds CRS points", required: false },
  ],
};

const FST_CHECKLIST: StreamChecklist = {
  stream: "fst",
  label: "Federal Skilled Trades (FST)",
  description: "For workers qualified in a skilled trade with a valid job offer or certificate of qualification.",
  stage: "single",
  items: [
    ...COMMON_FEDERAL,
    LANGUAGE_TEST,
    EMPLOYMENT_LETTERS,
    { key: "cert_of_qualification", label: "Certificate of Qualification", description: "Issued by a Canadian provincial/territorial authority, or a valid job offer from up to 2 employers", required: true },
    { key: "trade_experience", label: "Proof of Trade Experience (2+ years)", description: "Reference letters detailing skilled trade work within the last 5 years", required: true },
    PROOF_OF_FUNDS,
  ],
};

// ====================
// PGWP
// ====================

const PGWP_CHECKLIST: StreamChecklist = {
  stream: "pgwp",
  label: "Post-Graduation Work Permit (PGWP)",
  description: "For international graduates of eligible Canadian institutions.",
  stage: "single",
  items: [
    { key: "passport", label: "Valid Passport", description: "Must be valid at time of application", required: true },
    { key: "study_permit", label: "Current Study Permit", description: "Must be valid or within 180 days of expiry", required: true },
    { key: "completion_letter", label: "Letter of Completion from Institution", description: "Confirming you completed your program and are eligible to graduate", required: true },
    { key: "transcripts", label: "Official Transcripts", description: "Showing all courses and grades", required: true },
    { key: "photos", label: "Passport-size Photos", description: "Meeting IRCC specifications", required: true },
    { key: "language_test_pgwp", label: "Language Test Results", description: "May be required for programs ending after Nov 1, 2024 depending on your program", required: false },
    { key: "field_of_study_letter", label: "Field of Study Documentation", description: "For programs requiring specific fields under new PGWP rules", required: false },
  ],
};

// ====================
// PNP — PROVINCIAL STAGE
// ====================

function makePnpProvincialChecklist(province: string, label: string, extras: ChecklistItem[] = []): StreamChecklist {
  return {
    stream: `pnp_${province}_provincial`,
    label: `${label} — Provincial Stage`,
    description: `Documents for provincial nomination application to ${label}. Requirements vary by specific stream within the province.`,
    stage: "provincial",
    items: [
      { key: "passport", label: "Valid Passport", description: "Copy of bio page", required: true },
      LANGUAGE_TEST,
      EMPLOYMENT_LETTERS,
      EDUCATION_DOCS,
      { key: "resume", label: "Resume / CV", description: "Detailed, up-to-date resume showing all work and education history", required: true },
      { key: "job_offer_pnp", label: "Job Offer from Provincial Employer", description: "Required for employer-driven streams. Must be from eligible employer in the province.", required: false },
      { key: "ee_profile_proof", label: "Express Entry Profile Number", description: "Required if applying through EE-linked PNP stream", required: false },
      ...extras,
    ],
  };
}

function makePnpFederalChecklist(province: string, label: string): StreamChecklist {
  return {
    stream: `pnp_${province}_federal`,
    label: `${label} — Federal PR Stage`,
    description: `After receiving your ${label} provincial nomination, submit federal PR application.`,
    stage: "federal",
    items: [
      ...COMMON_FEDERAL,
      LANGUAGE_TEST,
      EMPLOYMENT_LETTERS,
      EDUCATION_DOCS,
      ECA,
      { key: "pnp_nomination_cert", label: "Provincial Nomination Certificate", description: `Official nomination letter/certificate from ${label}`, required: true },
      { key: "proof_of_funds_pnp", label: "Proof of Settlement Funds", description: "May be waived if currently working in Canada with valid permit", required: false },
      { key: "work_permit_copies", label: "Work Permit Copies", description: "All current and previous work permits", required: true },
    ],
  };
}

// Province-specific extras
const NS_EXTRAS: ChecklistItem[] = [
  { key: "ns_connection", label: "Proof of NS Connection", description: "Job offer, previous work/study in NS, or family connection depending on stream", required: false },
  { key: "ns_settlement_plan", label: "Settlement Plan", description: "Demonstrating intent to settle in Nova Scotia", required: false },
];

const ON_EXTRAS: ChecklistItem[] = [
  { key: "on_job_offer", label: "Ontario Job Offer (TEER-specific)", description: "Required for Employer Job Offer streams", required: false },
  { key: "on_ee_score", label: "Express Entry Score Proof", description: "Required for Ontario HCP and EE-linked streams", required: false },
];

const BC_EXTRAS: ChecklistItem[] = [
  { key: "bc_job_offer", label: "BC Job Offer", description: "Required for Skills Immigration streams — must be indeterminate full-time", required: false },
  { key: "bc_employer_registration", label: "BC Employer Registration", description: "Employer must register with BC PNP", required: false },
];

const AB_EXTRAS: ChecklistItem[] = [
  { key: "ab_connection", label: "Alberta Connection Documentation", description: "Job offer, family, or previous Alberta residency", required: false },
];

const SK_EXTRAS: ChecklistItem[] = [
  { key: "sk_sinp_eoi", label: "SINP Expression of Interest", description: "Required for International Skilled Worker categories", required: false },
  { key: "sk_points_proof", label: "Points Qualification Proof", description: "Evidence supporting SINP points claim", required: false },
];

const MB_EXTRAS: ChecklistItem[] = [
  { key: "mb_connection", label: "Manitoba Connection Proof", description: "Family, previous education/work, or Strategic Recruitment initiative", required: false },
  { key: "mb_settlement_plan", label: "Manitoba Settlement Plan", description: "Demonstrating intent to settle in Manitoba", required: false },
];

const NB_EXTRAS: ChecklistItem[] = [
  { key: "nb_connection", label: "NB Connection / Job Offer", description: "Connection to New Brunswick through employment, education, or family", required: false },
];

const PE_EXTRAS: ChecklistItem[] = [
  { key: "pe_job_offer", label: "PEI Job Offer", description: "From eligible PEI employer", required: false },
  { key: "pe_endorsement", label: "PEI Community Endorsement", description: "For community-based streams", required: false },
];

const NL_EXTRAS: ChecklistItem[] = [
  { key: "nl_job_offer", label: "NL Job Offer or Employer Connection", description: "Required for most NL PNP streams", required: false },
];

// Atlantic Immigration Program — separate from PNP
const AIP_PROVINCIAL: StreamChecklist = {
  stream: "aip_provincial",
  label: "Atlantic Immigration Program (AIP) — Endorsement Stage",
  description: "Employer-driven program for Atlantic provinces (NS, NB, NL, PEI). Requires designated employer and settlement plan.",
  stage: "provincial",
  items: [
    { key: "passport", label: "Valid Passport", description: "Copy of bio page", required: true },
    LANGUAGE_TEST,
    EMPLOYMENT_LETTERS,
    EDUCATION_DOCS,
    { key: "aip_job_offer", label: "Job Offer from Designated AIP Employer", description: "Must be from an employer designated under AIP in an Atlantic province", required: true },
    { key: "aip_settlement_plan", label: "Settlement Plan", description: "Created with a designated settlement service provider in the Atlantic province", required: true },
    { key: "aip_needs_assessment", label: "Needs Assessment", description: "Completed with a settlement service provider organization", required: true },
    { key: "aip_endorsement", label: "Provincial Endorsement Application", description: "Submit to the Atlantic province for endorsement", required: true },
    ECA,
  ],
};

const AIP_FEDERAL: StreamChecklist = {
  stream: "aip_federal",
  label: "Atlantic Immigration Program (AIP) — Federal PR Stage",
  description: "After receiving provincial endorsement under AIP, submit federal PR application.",
  stage: "federal",
  items: [
    ...COMMON_FEDERAL,
    LANGUAGE_TEST,
    EMPLOYMENT_LETTERS,
    EDUCATION_DOCS,
    ECA,
    { key: "aip_endorsement_cert", label: "Provincial Endorsement Certificate", description: "Official endorsement from the Atlantic province", required: true },
    { key: "aip_job_offer_federal", label: "Designated Employer Job Offer", description: "Same job offer used for endorsement", required: true },
    { key: "aip_settlement_plan_federal", label: "Settlement Plan Copy", description: "Copy of settlement plan submitted during endorsement", required: true },
    PROOF_OF_FUNDS,
  ],
};

// Rural and Northern Immigration Pilot
const RNIP_CHECKLIST: StreamChecklist = {
  stream: "rnip",
  label: "Rural and Northern Immigration Pilot (RNIP)",
  description: "Community-driven program for smaller communities. Requires community recommendation.",
  stage: "single",
  items: [
    ...COMMON_FEDERAL,
    LANGUAGE_TEST,
    EMPLOYMENT_LETTERS,
    EDUCATION_DOCS,
    { key: "rnip_community_rec", label: "Community Recommendation", description: "From a participating RNIP community", required: true },
    { key: "rnip_job_offer", label: "Job Offer from Community Employer", description: "Genuine, full-time, non-seasonal from employer in the community", required: true },
    PROOF_OF_FUNDS,
  ],
};

// Agri-Food Pilot
const AGRIFOOD_CHECKLIST: StreamChecklist = {
  stream: "agrifood",
  label: "Agri-Food Immigration Pilot",
  description: "For experienced workers in specific agri-food industries and occupations.",
  stage: "single",
  items: [
    ...COMMON_FEDERAL,
    { key: "language_test_agri", label: "Language Test Results", description: "CLB 4+ required", required: true },
    { key: "agri_job_offer", label: "Genuine Job Offer", description: "Full-time, non-seasonal from eligible agri-food employer", required: true },
    { key: "agri_work_experience", label: "Canadian Work Experience (1+ year)", description: "In eligible agri-food occupation within last 3 years", required: true },
    EMPLOYMENT_LETTERS,
    EDUCATION_DOCS,
    PROOF_OF_FUNDS,
  ],
};

// Study-to-PR pathway checklist
const STUDY_TO_PR: StreamChecklist = {
  stream: "study_to_pr",
  label: "Study-to-PR Pathway",
  description: "For international students planning the study permit → PGWP → PR pathway.",
  stage: "single",
  items: [
    { key: "passport", label: "Valid Passport", description: "Valid for duration of study + additional time", required: true },
    { key: "study_permit_copy", label: "Study Permit", description: "Current valid study permit", required: true },
    { key: "completion_letter_spr", label: "Program Completion Letter", description: "From eligible DLI confirming program completion", required: true },
    { key: "pgwp_or_wp", label: "PGWP or Valid Work Permit", description: "Post-graduation or other work authorization", required: true },
    LANGUAGE_TEST,
    EMPLOYMENT_LETTERS,
    { key: "pay_stubs_spr", label: "Canadian Pay Stubs / T4s", description: "Proof of Canadian work experience accumulation", required: true },
    { key: "noc_proof", label: "NOC Code Documentation", description: "Confirm your occupation matches eligible NOC/TEER", required: true },
    ECA,
  ],
};

// Work Permit to PR
const WP_TO_PR: StreamChecklist = {
  stream: "wp_to_pr",
  label: "Work Permit to PR Pathway",
  description: "For workers on LMIA-based, CUSMA, intra-company, or other work permits transitioning to PR.",
  stage: "single",
  items: [
    ...COMMON_FEDERAL,
    LANGUAGE_TEST,
    EMPLOYMENT_LETTERS,
    { key: "work_permit_current", label: "Current Work Permit", description: "Valid work authorization in Canada", required: true },
    { key: "employer_letter_wp", label: "Current Employer Letter", description: "Confirming ongoing employment, position, salary", required: true },
    { key: "pay_stubs_wp", label: "Canadian Pay Stubs & T4s", description: "For all years worked in Canada", required: true },
    ECA,
    EDUCATION_DOCS,
    PROOF_OF_FUNDS,
  ],
};

// Build all PNP checklists
const PROVINCES = [
  { code: "ns", label: "Nova Scotia (NSNP)", extras: NS_EXTRAS },
  { code: "on", label: "Ontario (OINP)", extras: ON_EXTRAS },
  { code: "bc", label: "British Columbia (BC PNP)", extras: BC_EXTRAS },
  { code: "ab", label: "Alberta (AAIP)", extras: AB_EXTRAS },
  { code: "sk", label: "Saskatchewan (SINP)", extras: SK_EXTRAS },
  { code: "mb", label: "Manitoba (MPNP)", extras: MB_EXTRAS },
  { code: "nb", label: "New Brunswick (NBPNP)", extras: NB_EXTRAS },
  { code: "pe", label: "Prince Edward Island (PEI PNP)", extras: PE_EXTRAS },
  { code: "nl", label: "Newfoundland & Labrador (NL PNP)", extras: NL_EXTRAS },
];

const PNP_PROVINCIAL_CHECKLISTS = PROVINCES.map(p =>
  makePnpProvincialChecklist(p.code, p.label, p.extras)
);

const PNP_FEDERAL_CHECKLISTS = PROVINCES.map(p =>
  makePnpFederalChecklist(p.code, p.label)
);

// Master list
export const PR_STREAM_CHECKLISTS: StreamChecklist[] = [
  CEC_CHECKLIST,
  FSW_CHECKLIST,
  FST_CHECKLIST,
  PGWP_CHECKLIST,
  ...PNP_PROVINCIAL_CHECKLISTS,
  ...PNP_FEDERAL_CHECKLISTS,
  AIP_PROVINCIAL,
  AIP_FEDERAL,
  RNIP_CHECKLIST,
  AGRIFOOD_CHECKLIST,
  STUDY_TO_PR,
  WP_TO_PR,
];

export function getChecklistForStream(stream: string): StreamChecklist | undefined {
  return PR_STREAM_CHECKLISTS.find(c => c.stream === stream);
}

// Grouped for UI selection
export interface StreamGroup {
  groupLabel: string;
  streams: { stream: string; label: string; stage: "provincial" | "federal" | "single" }[];
}

export const STREAM_GROUPS: StreamGroup[] = [
  {
    groupLabel: "Federal PR Streams",
    streams: [
      { stream: "cec", label: "Canadian Experience Class (CEC)", stage: "single" },
      { stream: "fsw", label: "Federal Skilled Worker (FSW)", stage: "single" },
      { stream: "fst", label: "Federal Skilled Trades (FST)", stage: "single" },
    ],
  },
  {
    groupLabel: "Provincial Nominee Programs — Provincial Stage",
    streams: PNP_PROVINCIAL_CHECKLISTS.map(c => ({ stream: c.stream, label: c.label, stage: c.stage })),
  },
  {
    groupLabel: "Provincial Nominee Programs — Federal PR Stage",
    streams: PNP_FEDERAL_CHECKLISTS.map(c => ({ stream: c.stream, label: c.label, stage: c.stage })),
  },
  {
    groupLabel: "Atlantic Immigration Program (AIP)",
    streams: [
      { stream: "aip_provincial", label: "AIP — Endorsement Stage", stage: "provincial" },
      { stream: "aip_federal", label: "AIP — Federal PR Stage", stage: "federal" },
    ],
  },
  {
    groupLabel: "Other Pathways",
    streams: [
      { stream: "pgwp", label: "Post-Graduation Work Permit (PGWP)", stage: "single" },
      { stream: "rnip", label: "Rural & Northern Immigration Pilot", stage: "single" },
      { stream: "agrifood", label: "Agri-Food Immigration Pilot", stage: "single" },
      { stream: "study_to_pr", label: "Study-to-PR Pathway", stage: "single" },
      { stream: "wp_to_pr", label: "Work Permit to PR Pathway", stage: "single" },
    ],
  },
];

export const APPLICATION_STAGES: { value: ApplicationStage; label: string; description: string }[] = [
  { value: "pre_application", label: "Pre-Application", description: "Gathering documents, haven't applied yet" },
  { value: "provincial_applied", label: "Applied Provincially", description: "Submitted provincial nomination application" },
  { value: "nominated", label: "Received Nomination", description: "Got provincial nomination, preparing federal PR" },
  { value: "federal_applied", label: "Applied Federally", description: "Submitted federal PR application" },
  { value: "waiting_decision", label: "Waiting for Decision", description: "Federal PR application under review" },
];

export function getRecommendedChecklist(stream: string, stage: ApplicationStage): string {
  if (stage === "nominated" || stage === "federal_applied" || stage === "waiting_decision") {
    const federalStream = stream.replace("_provincial", "_federal");
    if (PR_STREAM_CHECKLISTS.find(c => c.stream === federalStream)) {
      return federalStream;
    }
  }
  return stream;
}
