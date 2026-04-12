export interface IRCCSource {
  key: string;
  name: string;
  url: string;
  type: "rss" | "page";
  category: string;
  fetchIntervalMinutes: number;
}

export const IRCC_SOURCES: IRCCSource[] = [
  {
    key: "ircc_news_rss",
    name: "IRCC News & Notices",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/news.xml",
    type: "rss",
    category: "general_news",
    fetchIntervalMinutes: 30,
  },
  {
    key: "ircc_newsroom",
    name: "IRCC Newsroom",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices.html",
    type: "page",
    category: "general_news",
    fetchIntervalMinutes: 60,
  },
  {
    key: "ee_rounds",
    name: "Express Entry Rounds",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations.html",
    type: "page",
    category: "express_entry_draw",
    fetchIntervalMinutes: 60,
  },
  {
    key: "processing_times",
    name: "IRCC Processing Times",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html",
    type: "page",
    category: "processing_time",
    fetchIntervalMinutes: 360,
  },
  {
    key: "pgwp_eligibility",
    name: "PGWP Eligibility",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/after-graduation/eligibility.html",
    type: "page",
    category: "pgwp_update",
    fetchIntervalMinutes: 360,
  },
  {
    key: "category_based",
    name: "Category-Based Selection",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations/category-based-selection.html",
    type: "page",
    category: "category_based_draw",
    fetchIntervalMinutes: 120,
  },
  {
    key: "levels_plan",
    name: "Immigration Levels Plan",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices/supplementary-immigration-levels-2025-2027.html",
    type: "page",
    category: "levels_plan",
    fetchIntervalMinutes: 1440,
  },
];

export const AFFECTED_GROUPS = [
  "pgwp_holder",
  "pgwp_applicant",
  "student_visa",
  "work_permit",
  "ee_candidate",
  "pr_applicant",
  "pnp_applicant",
  "maintained_status",
  "all",
] as const;

export const UPDATE_CATEGORIES = [
  { value: "express_entry_draw", label: "Express Entry Draws", color: "blue" },
  { value: "processing_time", label: "Processing Times", color: "purple" },
  { value: "policy_change", label: "Policy Changes", color: "red" },
  { value: "pgwp_update", label: "PGWP Updates", color: "green" },
  { value: "pnp_update", label: "PNP Updates", color: "orange" },
  { value: "eligibility_change", label: "Eligibility Changes", color: "red" },
  { value: "rule_change", label: "Rule Changes", color: "amber" },
  { value: "levels_plan", label: "Levels Plan", color: "indigo" },
  { value: "category_based_draw", label: "Category-Based Draws", color: "teal" },
  { value: "general_news", label: "General News", color: "gray" },
  { value: "transition_rule", label: "Transition Rules", color: "yellow" },
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
    eligibility_change: "bg-red-100 text-red-800",
    rule_change: "bg-amber-100 text-amber-800",
    levels_plan: "bg-indigo-100 text-indigo-800",
    category_based_draw: "bg-teal-100 text-teal-800",
    general_news: "bg-gray-100 text-gray-800",
    transition_rule: "bg-yellow-100 text-yellow-800",
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
