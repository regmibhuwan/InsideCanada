import { differenceInDays, parseISO } from "date-fns";
import type { UserCase, RiskAlert, AlertSeverity, AlertType } from "./types";

interface RiskCheck {
  type: AlertType;
  check: (userCase: UserCase) => RiskAlert[];
}

function createAlert(
  userId: string,
  type: AlertType,
  severity: AlertSeverity,
  title: string,
  message: string,
  relatedDate?: string,
  actionUrl?: string,
  actionLabel?: string
): RiskAlert {
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    alert_type: type,
    severity,
    title,
    message,
    action_url: actionUrl,
    action_label: actionLabel,
    is_read: false,
    is_dismissed: false,
    related_date: relatedDate,
    created_at: new Date().toISOString(),
  };
}

const riskChecks: RiskCheck[] = [
  {
    type: "permit_expiry",
    check: (uc) => {
      const alerts: RiskAlert[] = [];
      for (const permit of uc.permits) {
        if (permit.status === "cancelled" || permit.status === "renewed") continue;
        const days = differenceInDays(parseISO(permit.expiry_date), new Date());
        if (days < 0 && !permit.is_maintained_status) {
          alerts.push(createAlert(
            uc.profile.id, "permit_expiry", "critical",
            "Work Permit Has Expired",
            `Your work permit expired ${Math.abs(days)} days ago. If you haven't applied for an extension or new status, you may be out of status. Seek legal advice immediately.`,
            permit.expiry_date, "/escalation", "Talk to an Advisor"
          ));
        } else if (days <= 30 && days >= 0) {
          alerts.push(createAlert(
            uc.profile.id, "permit_expiry", "critical",
            "Work Permit Expiring in " + days + " Days",
            `Your work permit expires on ${permit.expiry_date}. You must apply for an extension or new status before it expires to maintain legal status in Canada.`,
            permit.expiry_date, "/profile", "Review Permit"
          ));
        } else if (days <= 90 && days > 30) {
          alerts.push(createAlert(
            uc.profile.id, "permit_expiry", "high",
            "Work Permit Expiring Soon",
            `Your work permit expires in ${days} days. Start preparing your extension or transition application now.`,
            permit.expiry_date, "/timeline", "View Timeline"
          ));
        } else if (days <= 180 && days > 90) {
          alerts.push(createAlert(
            uc.profile.id, "permit_expiry", "medium",
            "Plan Ahead: Permit Expiry in " + days + " Days",
            `Your work permit expires in about ${Math.floor(days / 30)} months. Good time to plan your next steps.`,
            permit.expiry_date, "/eligibility", "Check Eligibility"
          ));
        }
      }
      return alerts;
    },
  },
  {
    type: "passport_expiry",
    check: (uc) => {
      const alerts: RiskAlert[] = [];
      for (const passport of uc.passports) {
        const days = differenceInDays(parseISO(passport.expiry_date), new Date());
        if (days < 0) {
          alerts.push(createAlert(
            uc.profile.id, "passport_expiry", "critical",
            "Passport Has Expired",
            "Your passport has expired. Renew it immediately — an expired passport can delay or block immigration applications.",
            passport.expiry_date
          ));
        } else if (days <= 180) {
          alerts.push(createAlert(
            uc.profile.id, "passport_expiry", "high",
            "Passport Expiring in " + days + " Days",
            "Many immigration applications require a passport valid for at least 6 months. Renew your passport soon.",
            passport.expiry_date
          ));
        }
      }
      return alerts;
    },
  },
  {
    type: "language_test_expiry",
    check: (uc) => {
      const alerts: RiskAlert[] = [];
      for (const test of uc.languageTests) {
        const days = differenceInDays(parseISO(test.expiry_date), new Date());
        if (days < 0) {
          alerts.push(createAlert(
            uc.profile.id, "language_test_expiry", "high",
            "Language Test Results Expired",
            "Your language test results have expired. You'll need to retake the test for any Express Entry or PNP application.",
            test.expiry_date
          ));
        } else if (days <= 90) {
          alerts.push(createAlert(
            uc.profile.id, "language_test_expiry", "medium",
            "Language Test Expiring Soon",
            `Your ${test.test_type.toUpperCase()} results expire in ${days} days. Book a new test now if you plan to apply for PR.`,
            test.expiry_date
          ));
        }
      }
      return alerts;
    },
  },
  {
    type: "maintained_status_risk",
    check: (uc) => {
      const alerts: RiskAlert[] = [];
      if (uc.profile.immigration_status === "maintained_status") {
        const maintainedPermit = uc.permits.find(p => p.is_maintained_status);
        if (maintainedPermit) {
          alerts.push(createAlert(
            uc.profile.id, "maintained_status_risk", "high",
            "You're on Maintained Status",
            "You're on maintained (implied) status while waiting for a decision. You can continue working under the same conditions as your previous permit, but restrictions apply. Do NOT change employers without verifying your conditions.",
            undefined, "/advisor", "Ask AI Advisor"
          ));
        }
      }
      return alerts;
    },
  },
  {
    type: "missing_document",
    check: (uc) => {
      const alerts: RiskAlert[] = [];
      const hasPermitCopy = uc.documents.some(d => d.document_type === "work_permit");
      const hasPassportCopy = uc.documents.some(d => d.document_type === "passport");
      const hasLanguageResult = uc.documents.some(d =>
        d.document_type === "ielts_result" || d.document_type === "celpip_result"
      );

      if (!hasPermitCopy && uc.permits.length > 0) {
        alerts.push(createAlert(
          uc.profile.id, "missing_document", "medium",
          "Upload Your Work Permit",
          "Keep a digital copy of your work permit in your document vault for quick reference and application preparation.",
          undefined, "/documents", "Upload Now"
        ));
      }
      if (!hasPassportCopy && uc.passports.length > 0) {
        alerts.push(createAlert(
          uc.profile.id, "missing_document", "medium",
          "Upload Your Passport Copy",
          "Store a copy of your passport in your document vault. You'll need it for every immigration application.",
          undefined, "/documents", "Upload Now"
        ));
      }
      if (!hasLanguageResult && uc.languageTests.length > 0) {
        alerts.push(createAlert(
          uc.profile.id, "missing_document", "medium",
          "Upload Language Test Results",
          "Upload your language test results document for easy access during applications.",
          undefined, "/documents", "Upload Now"
        ));
      }
      return alerts;
    },
  },
  {
    type: "action_required",
    check: (uc) => {
      const alerts: RiskAlert[] = [];
      const canadianMonths = calculateCanadianMonths(uc);
      if (canadianMonths >= 10 && canadianMonths < 12 && !uc.languageTests.length) {
        alerts.push(createAlert(
          uc.profile.id, "action_required", "high",
          "Book Your Language Test Now",
          "You're approaching 1 year of Canadian experience. Book your IELTS or CELPIP now so you can apply for CEC as soon as you're eligible.",
          undefined, "/eligibility", "Check Eligibility"
        ));
      }
      const hasECA = uc.educationHistory.some(e => e.eca_completed);
      const hasForeignEd = uc.educationHistory.some(e => !e.is_canadian);
      if (hasForeignEd && !hasECA) {
        alerts.push(createAlert(
          uc.profile.id, "action_required", "medium",
          "Get Your ECA Done",
          "You have foreign education but no ECA (Educational Credential Assessment). An ECA is required for Express Entry and gives you additional CRS points.",
          undefined, "/profile", "Update Education"
        ));
      }
      return alerts;
    },
  },
];

function calculateCanadianMonths(uc: UserCase): number {
  let totalDays = 0;
  for (const job of uc.workHistory) {
    if (!job.is_canadian_experience) continue;
    const start = parseISO(job.start_date);
    const end = job.is_current ? new Date() : job.end_date ? parseISO(job.end_date) : new Date();
    totalDays += differenceInDays(end, start);
  }
  return Math.floor(totalDays / 30);
}

export function runRiskAnalysis(userCase: UserCase): RiskAlert[] {
  const allAlerts: RiskAlert[] = [];
  for (const check of riskChecks) {
    allAlerts.push(...check.check(userCase));
  }
  return allAlerts.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}
