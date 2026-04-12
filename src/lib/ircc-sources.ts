export interface IRCCSource {
  key: string;
  name: string;
  url: string;
  type: "rss" | "page";
  category: string;
  province?: string;
  audience: string[];
  reliability: "official" | "official_provincial" | "secondary";
  fetchIntervalMinutes: number;
}

export const IRCC_SOURCES: IRCCSource[] = [
  // ── Federal IRCC ──
  {
    key: "ircc_notices",
    name: "IRCC Notices",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices.html",
    type: "page",
    category: "general_news",
    audience: ["all"],
    reliability: "official",
    fetchIntervalMinutes: 60,
  },
  {
    key: "ircc_news_releases",
    name: "IRCC News Releases",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/news/news-releases.html",
    type: "page",
    category: "general_news",
    audience: ["all"],
    reliability: "official",
    fetchIntervalMinutes: 60,
  },
  {
    key: "ircc_news_rss",
    name: "IRCC News RSS",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/news.xml",
    type: "rss",
    category: "general_news",
    audience: ["all"],
    reliability: "official",
    fetchIntervalMinutes: 60,
  },

  // ── Processing Times ──
  {
    key: "processing_times",
    name: "IRCC Processing Times",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html",
    type: "page",
    category: "processing_time",
    audience: ["pr_applicant", "pnp_applicant", "ee_candidate", "all"],
    reliability: "official",
    fetchIntervalMinutes: 360,
  },

  // ── Express Entry ──
  {
    key: "ee_main",
    name: "Express Entry",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html",
    type: "page",
    category: "express_entry_draw",
    audience: ["ee_candidate", "pr_applicant"],
    reliability: "official",
    fetchIntervalMinutes: 120,
  },

  // ── Provincial Nominees (Federal) ──
  {
    key: "pnp_federal",
    name: "Provincial Nominees (Federal)",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees.html",
    type: "page",
    category: "pnp_update",
    audience: ["pnp_applicant", "all"],
    reliability: "official",
    fetchIntervalMinutes: 360,
  },

  // ── Eligibility & Language ──
  {
    key: "ee_language_req",
    name: "EE Language Requirements",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/become-candidate/eligibility/language-requirements.html",
    type: "page",
    category: "eligibility_change",
    audience: ["ee_candidate", "pr_applicant"],
    reliability: "official",
    fetchIntervalMinutes: 720,
  },
  {
    key: "ee_language_tests",
    name: "Acceptable Language Tests",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/become-candidate/eligibility/language-test-acceptable.html",
    type: "page",
    category: "eligibility_change",
    audience: ["ee_candidate", "pr_applicant", "all"],
    reliability: "official",
    fetchIntervalMinutes: 720,
  },
  {
    key: "fsw_eligibility",
    name: "FSW Eligibility",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/federal-skilled-workers.html",
    type: "page",
    category: "eligibility_change",
    audience: ["ee_candidate"],
    reliability: "official",
    fetchIntervalMinutes: 720,
  },
  {
    key: "cec_eligibility",
    name: "CEC Eligibility",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/canadian-experience-class.html",
    type: "page",
    category: "eligibility_change",
    audience: ["ee_candidate", "pgwp_holder", "work_permit"],
    reliability: "official",
    fetchIntervalMinutes: 720,
  },

  // ── Study / Work / PGWP ──
  {
    key: "study_canada",
    name: "Study in Canada",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html",
    type: "page",
    category: "pgwp_update",
    audience: ["student_visa"],
    reliability: "official",
    fetchIntervalMinutes: 720,
  },
  {
    key: "work_off_campus",
    name: "Work Off Campus",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/work-off-campus.html",
    type: "page",
    category: "pgwp_update",
    audience: ["student_visa"],
    reliability: "official",
    fetchIntervalMinutes: 720,
  },
  {
    key: "pgwp",
    name: "Post-Graduation Work Permit",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/post-graduation-work-permit.html",
    type: "page",
    category: "pgwp_update",
    audience: ["pgwp_holder", "pgwp_applicant", "student_visa"],
    reliability: "official",
    fetchIntervalMinutes: 360,
  },
  {
    key: "work_canada",
    name: "Work in Canada",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada.html",
    type: "page",
    category: "rule_change",
    audience: ["work_permit", "pgwp_holder"],
    reliability: "official",
    fetchIntervalMinutes: 720,
  },

  // ── Atlantic Immigration ──
  {
    key: "aip_main",
    name: "Atlantic Immigration Program",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html",
    type: "page",
    category: "pnp_update",
    province: "Atlantic",
    audience: ["aip_applicant", "pnp_applicant"],
    reliability: "official",
    fetchIntervalMinutes: 360,
  },

  // ── Provincial Sites ──
  {
    key: "nsnp_main",
    name: "Nova Scotia Immigration",
    url: "https://novascotiaimmigration.com/",
    type: "page",
    category: "pnp_update",
    province: "Nova Scotia",
    audience: ["nsnp_applicant", "pnp_applicant"],
    reliability: "official_provincial",
    fetchIntervalMinutes: 360,
  },
  {
    key: "nsnp_move",
    name: "NSNP Move Here",
    url: "https://novascotiaimmigration.com/move-here/",
    type: "page",
    category: "pnp_update",
    province: "Nova Scotia",
    audience: ["nsnp_applicant", "pnp_applicant"],
    reliability: "official_provincial",
    fetchIntervalMinutes: 360,
  },
  {
    key: "oinp_main",
    name: "Ontario Immigrant Nominee Program",
    url: "https://www.ontario.ca/page/ontario-immigrant-nominee-program-oinp",
    type: "page",
    category: "pnp_update",
    province: "Ontario",
    audience: ["oinp_applicant", "pnp_applicant"],
    reliability: "official_provincial",
    fetchIntervalMinutes: 360,
  },
  {
    key: "bcpnp_main",
    name: "BC Provincial Nominee Program",
    url: "https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program",
    type: "page",
    category: "pnp_update",
    province: "British Columbia",
    audience: ["bcpnp_applicant", "pnp_applicant"],
    reliability: "official_provincial",
    fetchIntervalMinutes: 360,
  },
  {
    key: "aaip_main",
    name: "Alberta Advantage Immigration Program",
    url: "https://www.alberta.ca/alberta-advantage-immigration-program",
    type: "page",
    category: "pnp_update",
    province: "Alberta",
    audience: ["pnp_applicant"],
    reliability: "official_provincial",
    fetchIntervalMinutes: 360,
  },
  {
    key: "sinp_main",
    name: "Saskatchewan Immigrant Nominee Program",
    url: "https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program",
    type: "page",
    category: "pnp_update",
    province: "Saskatchewan",
    audience: ["sinp_applicant", "pnp_applicant"],
    reliability: "official_provincial",
    fetchIntervalMinutes: 360,
  },
  {
    key: "mpnp_main",
    name: "Manitoba Provincial Nominee Program",
    url: "https://immigratemanitoba.com/immigrate-to-manitoba/",
    type: "page",
    category: "pnp_update",
    province: "Manitoba",
    audience: ["mpnp_applicant", "pnp_applicant"],
    reliability: "official_provincial",
    fetchIntervalMinutes: 360,
  },
  {
    key: "nbpnp_main",
    name: "New Brunswick Provincial Nominee Program",
    url: "https://www.welcomenb.ca/content/wel-bien/en/immigrating/content/HowCanIImmigrate/NBProvincialNomineeProgram.html",
    type: "page",
    category: "pnp_update",
    province: "New Brunswick",
    audience: ["pnp_applicant"],
    reliability: "official_provincial",
    fetchIntervalMinutes: 360,
  },
  {
    key: "peipnp_main",
    name: "PEI Provincial Nominee Program",
    url: "https://www.princeedwardisland.ca/en/topic/office-immigration",
    type: "page",
    category: "pnp_update",
    province: "Prince Edward Island",
    audience: ["pnp_applicant"],
    reliability: "official_provincial",
    fetchIntervalMinutes: 360,
  },
  {
    key: "nlpnp_main",
    name: "Newfoundland & Labrador PNP",
    url: "https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/provincial-nominee-program/",
    type: "page",
    category: "pnp_update",
    province: "Newfoundland and Labrador",
    audience: ["pnp_applicant"],
    reliability: "official_provincial",
    fetchIntervalMinutes: 360,
  },
];

export const AFFECTED_GROUPS = [
  "pgwp_holder", "pgwp_applicant", "student_visa", "work_permit",
  "ee_candidate", "pr_applicant", "pnp_applicant", "aip_applicant",
  "nsnp_applicant", "oinp_applicant", "bcpnp_applicant", "sinp_applicant",
  "mpnp_applicant", "maintained_status", "all",
] as const;

export const UPDATE_CATEGORIES = [
  { value: "express_entry_draw", label: "Express Entry", color: "blue" },
  { value: "processing_time", label: "Processing Times", color: "purple" },
  { value: "policy_change", label: "Policy Changes", color: "red" },
  { value: "pgwp_update", label: "PGWP / Study", color: "green" },
  { value: "pnp_update", label: "PNP / Provincial", color: "orange" },
  { value: "aip_update", label: "Atlantic (AIP)", color: "cyan" },
  { value: "eligibility_change", label: "Eligibility", color: "red" },
  { value: "rule_change", label: "Rule Changes", color: "amber" },
  { value: "levels_plan", label: "Levels Plan", color: "indigo" },
  { value: "category_based_draw", label: "Category Draws", color: "teal" },
  { value: "general_news", label: "General News", color: "gray" },
  { value: "transition_rule", label: "Transition Rules", color: "yellow" },
  { value: "provincial_draw", label: "Provincial Draws", color: "emerald" },
] as const;

export function getCategoryLabel(cat: string): string {
  return UPDATE_CATEGORIES.find(c => c.value === cat)?.label || cat;
}

export function getCategoryColor(cat: string): string {
  const colors: Record<string, string> = {
    express_entry_draw: "bg-blue-100 text-blue-800",
    processing_time: "bg-purple-100 text-purple-800",
    policy_change: "bg-red-100 text-red-800",
    pgwp_update: "bg-green-100 text-green-800",
    pnp_update: "bg-orange-100 text-orange-800",
    aip_update: "bg-cyan-100 text-cyan-800",
    eligibility_change: "bg-red-100 text-red-800",
    rule_change: "bg-amber-100 text-amber-800",
    levels_plan: "bg-indigo-100 text-indigo-800",
    category_based_draw: "bg-teal-100 text-teal-800",
    general_news: "bg-gray-100 text-gray-800",
    transition_rule: "bg-yellow-100 text-yellow-800",
    provincial_draw: "bg-emerald-100 text-emerald-800",
  };
  return colors[cat] || "bg-gray-100 text-gray-800";
}

export function getUrgencyColor(urgency: string): string {
  const colors: Record<string, string> = {
    critical: "bg-red-500 text-white",
    high: "bg-orange-500 text-white",
    normal: "bg-blue-500 text-white",
    low: "bg-gray-400 text-white",
  };
  return colors[urgency] || "bg-gray-400 text-white";
}

export function getReliabilityLabel(r: string): string {
  const m: Record<string, string> = {
    official: "Official IRCC",
    official_provincial: "Official Provincial",
    secondary: "Secondary Source",
  };
  return m[r] || r;
}

export const PROVINCES_WITH_PNP = [
  { code: "NS", name: "Nova Scotia", program: "NSNP" },
  { code: "ON", name: "Ontario", program: "OINP" },
  { code: "BC", name: "British Columbia", program: "BC PNP" },
  { code: "AB", name: "Alberta", program: "AAIP" },
  { code: "SK", name: "Saskatchewan", program: "SINP" },
  { code: "MB", name: "Manitoba", program: "MPNP" },
  { code: "NB", name: "New Brunswick", program: "NBPNP" },
  { code: "PE", name: "Prince Edward Island", program: "PEI PNP" },
  { code: "NL", name: "Newfoundland and Labrador", program: "NLPNP" },
] as const;
