export type ImmigrationStatus =
  | 'pgwp_holder'
  | 'student_visa'
  | 'work_permit'
  | 'maintained_status'
  | 'pr_applicant'
  | 'pr_holder'
  | 'citizen'
  | 'visitor'
  | 'bridging_open_wp';

export type PermitType =
  | 'pgwp'
  | 'closed_work_permit'
  | 'open_work_permit'
  | 'study_permit'
  | 'visitor_record'
  | 'bridging_open_wp'
  | 'lmia_work_permit'
  | 'trv';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AlertType =
  | 'permit_expiry'
  | 'passport_expiry'
  | 'language_test_expiry'
  | 'eca_expiry'
  | 'maintained_status_risk'
  | 'missing_document'
  | 'deadline_approaching'
  | 'status_loss_risk'
  | 'action_required'
  | 'eligibility_change'
  | 'policy_update';

export type DocumentType =
  | 'passport'
  | 'work_permit'
  | 'study_permit'
  | 'ielts_result'
  | 'celpip_result'
  | 'employment_letter'
  | 'pay_stub'
  | 'tax_return'
  | 'noa'
  | 'eca_report'
  | 'police_clearance'
  | 'medical_exam'
  | 'photo'
  | 'birth_certificate'
  | 'marriage_certificate'
  | 'proof_of_funds'
  | 'reference_letter'
  | 'job_offer_letter'
  | 'lmia'
  | 'provincial_nomination'
  | 'other';

export type MilestoneType =
  | 'profile_created'
  | 'language_test_taken'
  | 'eca_completed'
  | 'express_entry_profile'
  | 'crs_score_calculated'
  | 'ita_received'
  | 'pr_application_submitted'
  | 'medical_exam_done'
  | 'biometrics_done'
  | 'background_check'
  | 'pr_approved'
  | 'copr_received'
  | 'pr_card_received'
  | 'pnp_application'
  | 'pnp_nomination'
  | 'work_permit_extension'
  | 'maintained_status_started'
  | 'employer_found'
  | 'lmia_approved'
  | 'one_year_experience'
  | 'custom';

export type LanguageTestType =
  | 'ielts_general'
  | 'ielts_academic'
  | 'celpip'
  | 'tef'
  | 'tcf'
  | 'pte_core';

export type CredentialType =
  | 'high_school'
  | 'certificate'
  | 'diploma'
  | 'associates'
  | 'bachelors'
  | 'postgrad_diploma'
  | 'masters'
  | 'doctoral'
  | 'trade_certificate';

export type ConsultationType =
  | 'general_assessment'
  | 'pr_strategy'
  | 'work_permit_extension'
  | 'maintained_status'
  | 'refusal_review'
  | 'appeal'
  | 'pnp_advice'
  | 'employer_compliance'
  | 'urgent';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  nationality?: string;
  current_city?: string;
  current_province?: string;
  avatar_url?: string;
  immigration_status: ImmigrationStatus;
  pgwp_stream?: '3_year' | '18_month' | 'other';
  onboarding_completed: boolean;
  has_applied_pr: boolean;
  pr_application_program?: string;
  target_pr_stream?: string;
  crs_score?: number;
  onboarding_step?: number;
  notification_preferences?: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export type PRApplicationStage =
  | 'profile_created'
  | 'ita_received'
  | 'submitted'
  | 'aor_received'
  | 'biometrics_requested'
  | 'medical_requested'
  | 'background_check'
  | 'additional_docs'
  | 'decision_made'
  | 'approved'
  | 'refused'
  | 'withdrawn';

export interface PRApplication {
  id: string;
  user_id: string;
  program: string;
  application_number?: string;
  submission_date?: string;
  aor_date?: string;
  biometrics_date?: string;
  biometrics_done: boolean;
  medical_exam_date?: string;
  medical_passed: boolean;
  background_check_started?: string;
  additional_docs_requested: boolean;
  additional_docs_submitted?: string;
  gcms_notes_ordered: boolean;
  ita_date?: string;
  ita_crs_score?: number;
  noc_code_applied?: string;
  province_applied?: string;
  pnp_stream?: string;
  current_stage: PRApplicationStage;
  decision_date?: string;
  decision_result?: 'approved' | 'refused' | 'withdrawn';
  copr_date?: string;
  pr_card_date?: string;
  landing_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DrawInfo {
  date: string;
  program: string;
  crs_cutoff: number;
  invitations: number;
  tie_breaking_rule?: string;
  noc_categories?: string[];
}

export interface ProcessingTime {
  program: string;
  estimated_months: number;
  last_updated: string;
}

export interface Permit {
  id: string;
  user_id: string;
  permit_type: PermitType;
  permit_number?: string;
  issue_date?: string;
  expiry_date: string;
  status: 'active' | 'expired' | 'expiring_soon' | 'renewed' | 'cancelled';
  employer_name?: string;
  employer_lmia_number?: string;
  notes?: string;
  is_maintained_status: boolean;
  maintained_status_since?: string;
  extension_applied: boolean;
  extension_application_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Passport {
  id: string;
  user_id: string;
  passport_number?: string;
  country_of_issue: string;
  issue_date?: string;
  expiry_date: string;
  is_primary: boolean;
  created_at: string;
}

export interface LanguageTest {
  id: string;
  user_id: string;
  test_type: LanguageTestType;
  test_date: string;
  expiry_date: string;
  listening_score?: number;
  reading_score?: number;
  writing_score?: number;
  speaking_score?: number;
  overall_score?: number;
  clb_listening?: number;
  clb_reading?: number;
  clb_writing?: number;
  clb_speaking?: number;
  created_at: string;
}

export interface WorkHistory {
  id: string;
  user_id: string;
  job_title: string;
  employer_name: string;
  noc_code?: string;
  teer_category?: '0' | '1' | '2' | '3' | '4' | '5';
  is_canadian_experience: boolean;
  province?: string;
  city?: string;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  hours_per_week: number;
  is_full_time: boolean;
  duties?: string;
  created_at: string;
}

export interface EducationHistory {
  id: string;
  user_id: string;
  institution_name: string;
  program_name: string;
  credential_type: CredentialType;
  field_of_study?: string;
  is_canadian: boolean;
  is_dli: boolean;
  province?: string;
  start_date: string;
  end_date?: string;
  graduated: boolean;
  graduation_date?: string;
  eca_completed: boolean;
  eca_reference_number?: string;
  eca_expiry_date?: string;
  created_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  document_type: DocumentType;
  file_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  expiry_date?: string;
  notes?: string;
  is_verified: boolean;
  uploaded_at: string;
}

export interface Milestone {
  id: string;
  user_id: string;
  milestone_type: MilestoneType;
  title: string;
  description?: string;
  target_date?: string;
  completed_date?: string;
  is_completed: boolean;
  sort_order: number;
  created_at: string;
}

export interface RiskAlert {
  id: string;
  user_id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  action_url?: string;
  action_label?: string;
  is_read: boolean;
  is_dismissed: boolean;
  expires_at?: string;
  related_date?: string;
  created_at: string;
}

export interface Consultation {
  id: string;
  user_id: string;
  consultation_type: ConsultationType;
  status: 'requested' | 'matched' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  urgency: 'normal' | 'urgent' | 'emergency';
  subject: string;
  description?: string;
  preferred_language: string;
  advisor_name?: string;
  advisor_email?: string;
  scheduled_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AIConversation {
  id: string;
  user_id: string;
  messages: ChatMessage[];
  summary?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface UserCase {
  profile: Profile;
  permits: Permit[];
  passports: Passport[];
  languageTests: LanguageTest[];
  workHistory: WorkHistory[];
  educationHistory: EducationHistory[];
  documents: Document[];
  milestones: Milestone[];
  riskAlerts: RiskAlert[];
  prApplications: PRApplication[];
}

export interface EligibilityResult {
  program: string;
  eligible: boolean;
  score?: number;
  missingRequirements: string[];
  recommendations: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  category: 'deadline' | 'milestone' | 'action' | 'risk';
  status: 'completed' | 'upcoming' | 'overdue' | 'at_risk';
  priority: 'low' | 'medium' | 'high' | 'critical';
}
