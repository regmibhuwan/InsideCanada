import type { UserCase } from "./types";

interface UpdateRecord {
  id: string;
  title: string;
  summary: string;
  plain_language: string;
  source_url: string;
  source_name: string;
  is_official: boolean;
  confidence_score: number;
  published_at: string | null;
  detected_at: string;
  category: string;
  urgency: string;
  affected_groups: string[];
  action_required: string | null;
  diff_snapshot: string | null;
  metadata?: {
    source_reliability?: string;
    province?: string;
    source_audience?: string[];
    last_modified?: string;
    fetched_at?: string;
  };
}

export interface ScoredUpdate extends UpdateRecord {
  relevanceScore: number;
  whyThisMatters: string;
  sourceFreshness: string;
}

export function scoreUpdates(updates: UpdateRecord[], userCase: UserCase): ScoredUpdate[] {
  const profile = userCase.profile;
  if (!profile) return updates.map(u => ({ ...u, relevanceScore: 50, whyThisMatters: "General immigration update.", sourceFreshness: getFreshness(u) }));

  const userProvince = profile.current_province || "";
  const userStatus = profile.immigration_status || "";
  const hasApplied = profile.has_applied_pr;
  const targetStream = profile.target_pr_stream || profile.pr_application_program || "";
  const latestApp = userCase.prApplications?.[0];
  const userNoc = latestApp?.noc_code_applied || userCase.workHistory?.[0]?.noc_code || "";
  const hasLanguageTest = userCase.languageTests.length > 0;
  const activePermit = userCase.permits.find(p => p.status === "active");

  return updates
    .map(update => {
      let score = 0;
      const reasons: string[] = [];

      // Province match (highest priority)
      const updateProvince = update.metadata?.province || "";
      if (userProvince && updateProvince) {
        if (updateProvince.toLowerCase().includes(userProvince.toLowerCase()) ||
            userProvince.toLowerCase().includes(updateProvince.toLowerCase())) {
          score += 40;
          reasons.push(`This affects ${userProvince}, your province.`);
        }
      }

      // Source text province match
      const lowerTitle = update.title.toLowerCase();
      const lowerSummary = update.summary.toLowerCase();
      const combinedText = lowerTitle + " " + lowerSummary;
      if (userProvince && combinedText.includes(userProvince.toLowerCase())) {
        score += 20;
        if (!reasons.some(r => r.includes("province"))) {
          reasons.push(`Mentions ${userProvince}.`);
        }
      }

      // Status match
      const statusGroupMap: Record<string, string[]> = {
        pgwp_holder: ["pgwp_holder", "work_permit", "all"],
        student_visa: ["student_visa", "pgwp_applicant", "all"],
        work_permit: ["work_permit", "all"],
        maintained_status: ["maintained_status", "work_permit", "all"],
        pr_applicant: ["pr_applicant", "ee_candidate", "all"],
        bridging_open_wp: ["work_permit", "pr_applicant", "all"],
      };

      const userGroups = statusGroupMap[userStatus] || ["all"];
      const groupOverlap = update.affected_groups.filter(g => userGroups.includes(g) || g === "all");
      if (groupOverlap.length > 0 && !groupOverlap.every(g => g === "all")) {
        score += 25;
        reasons.push(`Relevant to your status as ${userStatus.replace(/_/g, " ")}.`);
      }

      // Stream match
      const streamKeywords: Record<string, string[]> = {
        pnp: ["pnp", "provincial nominee", "provincial nomination"],
        pnp_ee: ["pnp", "provincial nominee", "express entry"],
        nsnp: ["nova scotia", "nsnp", "labour market priorities"],
        cec: ["canadian experience class", "cec"],
        fsw: ["federal skilled worker", "fsw"],
        atlantic: ["atlantic immigration", "aip", "atlantic"],
        aipp: ["atlantic immigration", "aip", "atlantic"],
        oinp: ["ontario", "oinp"],
        bcpnp: ["british columbia", "bc pnp", "bcpnp"],
        sinp: ["saskatchewan", "sinp"],
        mpnp: ["manitoba", "mpnp"],
      };

      const streamKeys = streamKeywords[targetStream] || [];
      if (streamKeys.some(k => combinedText.includes(k))) {
        score += 30;
        reasons.push(`Related to your PR stream (${targetStream.toUpperCase()}).`);
      }

      // Category relevance based on user situation
      if (hasApplied) {
        if (update.category === "processing_time") {
          score += 20;
          reasons.push("Processing time updates matter while your application is pending.");
        }
        if (update.category === "policy_change" || update.category === "rule_change") {
          score += 15;
          reasons.push("Policy changes could affect your pending application.");
        }
      } else {
        if (update.category === "eligibility_change") {
          score += 20;
          reasons.push("Eligibility changes may affect your ability to apply.");
        }
        if (update.category === "express_entry_draw" || update.category === "category_based_draw") {
          score += 15;
          reasons.push("Draw updates help you plan when to apply.");
        }
      }

      // PGWP-specific
      if ((userStatus === "pgwp_holder" || userStatus === "student_visa") &&
          (update.category === "pgwp_update" || combinedText.includes("pgwp") || combinedText.includes("post-graduation"))) {
        score += 25;
        reasons.push("Directly affects PGWP holders and students.");
      }

      // Work permit holder
      if (userStatus === "work_permit" && (combinedText.includes("work permit") || combinedText.includes("lmia"))) {
        score += 15;
        reasons.push("Relevant to work permit holders.");
      }

      // NOC match
      if (userNoc && combinedText.includes(userNoc)) {
        score += 20;
        reasons.push(`Mentions your NOC code (${userNoc}).`);
      }

      // Urgency boost
      if (update.urgency === "critical") score += 15;
      if (update.urgency === "high") score += 10;

      // Official source boost
      if (update.is_official) score += 5;

      // Recency boost
      const detectedAge = Date.now() - new Date(update.detected_at).getTime();
      const daysSinceDetected = detectedAge / (1000 * 60 * 60 * 24);
      if (daysSinceDetected < 1) score += 10;
      else if (daysSinceDetected < 7) score += 5;

      // If no specific reason found, give generic explanation
      if (reasons.length === 0) {
        reasons.push("General immigration update that may be relevant.");
      }

      return {
        ...update,
        relevanceScore: Math.min(score, 100),
        whyThisMatters: reasons.slice(0, 3).join(" "),
        sourceFreshness: getFreshness(update),
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function getFreshness(update: UpdateRecord): string {
  const ref = update.metadata?.last_modified || update.published_at || update.detected_at;
  if (!ref) return "Unknown";
  const age = Date.now() - new Date(ref).getTime();
  const hours = Math.floor(age / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}
