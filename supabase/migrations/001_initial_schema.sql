-- InsideCanada Immigration Operating System - Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES: Core user immigration profile
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  date_of_birth date,
  nationality text,
  current_city text,
  current_province text,
  avatar_url text,
  immigration_status text not null default 'pgwp_holder'
    check (immigration_status in (
      'pgwp_holder', 'student_visa', 'work_permit', 'maintained_status',
      'pr_applicant', 'pr_holder', 'citizen', 'visitor', 'bridging_open_wp'
    )),
  pgwp_stream text check (pgwp_stream in ('3_year', '18_month', 'other')),
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- ============================================================
-- PERMITS: Work permits, study permits, visitor records
-- ============================================================
create table public.permits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  permit_type text not null check (permit_type in (
    'pgwp', 'closed_work_permit', 'open_work_permit', 'study_permit',
    'visitor_record', 'bridging_open_wp', 'lmia_work_permit', 'trv'
  )),
  permit_number text,
  issue_date date,
  expiry_date date not null,
  status text not null default 'active' check (status in ('active', 'expired', 'expiring_soon', 'renewed', 'cancelled')),
  employer_name text,
  employer_lmia_number text,
  notes text,
  is_maintained_status boolean default false,
  maintained_status_since date,
  extension_applied boolean default false,
  extension_application_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.permits enable row level security;
create policy "Users can manage own permits" on public.permits for all using (auth.uid() = user_id);

-- ============================================================
-- PASSPORT: Passport tracking
-- ============================================================
create table public.passports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  passport_number text,
  country_of_issue text not null,
  issue_date date,
  expiry_date date not null,
  is_primary boolean default true,
  created_at timestamptz default now()
);

alter table public.passports enable row level security;
create policy "Users can manage own passports" on public.passports for all using (auth.uid() = user_id);

-- ============================================================
-- LANGUAGE TESTS: IELTS, CELPIP, TEF, TCF
-- ============================================================
create table public.language_tests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  test_type text not null check (test_type in ('ielts_general', 'ielts_academic', 'celpip', 'tef', 'tcf', 'pte_core')),
  test_date date not null,
  expiry_date date not null,
  listening_score numeric(3,1),
  reading_score numeric(3,1),
  writing_score numeric(3,1),
  speaking_score numeric(3,1),
  overall_score numeric(3,1),
  clb_listening integer,
  clb_reading integer,
  clb_writing integer,
  clb_speaking integer,
  created_at timestamptz default now()
);

alter table public.language_tests enable row level security;
create policy "Users can manage own language tests" on public.language_tests for all using (auth.uid() = user_id);

-- ============================================================
-- WORK HISTORY: Canadian and foreign work experience
-- ============================================================
create table public.work_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_title text not null,
  employer_name text not null,
  noc_code text,
  teer_category text check (teer_category in ('0', '1', '2', '3', '4', '5')),
  is_canadian_experience boolean default true,
  province text,
  city text,
  start_date date not null,
  end_date date,
  is_current boolean default false,
  hours_per_week integer default 40,
  is_full_time boolean default true,
  duties text,
  created_at timestamptz default now()
);

alter table public.work_history enable row level security;
create policy "Users can manage own work history" on public.work_history for all using (auth.uid() = user_id);

-- ============================================================
-- EDUCATION HISTORY: Canadian and foreign education
-- ============================================================
create table public.education_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  institution_name text not null,
  program_name text not null,
  credential_type text not null check (credential_type in (
    'high_school', 'certificate', 'diploma', 'associates', 'bachelors',
    'postgrad_diploma', 'masters', 'doctoral', 'trade_certificate'
  )),
  field_of_study text,
  is_canadian boolean default true,
  is_dli boolean default true,
  province text,
  start_date date not null,
  end_date date,
  graduated boolean default false,
  graduation_date date,
  eca_completed boolean default false,
  eca_reference_number text,
  eca_expiry_date date,
  created_at timestamptz default now()
);

alter table public.education_history enable row level security;
create policy "Users can manage own education" on public.education_history for all using (auth.uid() = user_id);

-- ============================================================
-- DOCUMENTS: Document vault
-- ============================================================
create table public.documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_type text not null check (document_type in (
    'passport', 'work_permit', 'study_permit', 'ielts_result', 'celpip_result',
    'employment_letter', 'pay_stub', 'tax_return', 'noa', 'eca_report',
    'police_clearance', 'medical_exam', 'photo', 'birth_certificate',
    'marriage_certificate', 'proof_of_funds', 'reference_letter',
    'job_offer_letter', 'lmia', 'provincial_nomination', 'other'
  )),
  file_name text not null,
  file_url text not null,
  file_size integer,
  mime_type text,
  expiry_date date,
  notes text,
  is_verified boolean default false,
  uploaded_at timestamptz default now()
);

alter table public.documents enable row level security;
create policy "Users can manage own documents" on public.documents for all using (auth.uid() = user_id);

-- ============================================================
-- MILESTONES: PR and immigration milestones
-- ============================================================
create table public.milestones (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  milestone_type text not null check (milestone_type in (
    'profile_created', 'language_test_taken', 'eca_completed',
    'express_entry_profile', 'crs_score_calculated', 'ita_received',
    'pr_application_submitted', 'medical_exam_done', 'biometrics_done',
    'background_check', 'pr_approved', 'copr_received', 'pr_card_received',
    'pnp_application', 'pnp_nomination', 'work_permit_extension',
    'maintained_status_started', 'employer_found', 'lmia_approved',
    'one_year_experience', 'custom'
  )),
  title text not null,
  description text,
  target_date date,
  completed_date date,
  is_completed boolean default false,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table public.milestones enable row level security;
create policy "Users can manage own milestones" on public.milestones for all using (auth.uid() = user_id);

-- ============================================================
-- RISK ALERTS: System-generated alerts
-- ============================================================
create table public.risk_alerts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  alert_type text not null check (alert_type in (
    'permit_expiry', 'passport_expiry', 'language_test_expiry',
    'eca_expiry', 'maintained_status_risk', 'missing_document',
    'deadline_approaching', 'status_loss_risk', 'action_required',
    'eligibility_change', 'policy_update'
  )),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  title text not null,
  message text not null,
  action_url text,
  action_label text,
  is_read boolean default false,
  is_dismissed boolean default false,
  expires_at timestamptz,
  related_date date,
  created_at timestamptz default now()
);

alter table public.risk_alerts enable row level security;
create policy "Users can manage own alerts" on public.risk_alerts for all using (auth.uid() = user_id);

-- ============================================================
-- CONSULTATIONS: Lawyer/consultant escalation
-- ============================================================
create table public.consultations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  consultation_type text not null check (consultation_type in (
    'general_assessment', 'pr_strategy', 'work_permit_extension',
    'maintained_status', 'refusal_review', 'appeal', 'pnp_advice',
    'employer_compliance', 'urgent'
  )),
  status text not null default 'requested' check (status in (
    'requested', 'matched', 'scheduled', 'in_progress', 'completed', 'cancelled'
  )),
  urgency text not null default 'normal' check (urgency in ('normal', 'urgent', 'emergency')),
  subject text not null,
  description text,
  preferred_language text default 'english',
  advisor_name text,
  advisor_email text,
  scheduled_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.consultations enable row level security;
create policy "Users can manage own consultations" on public.consultations for all using (auth.uid() = user_id);

-- ============================================================
-- AI CONVERSATIONS: Chat history with AI advisor
-- ============================================================
create table public.ai_conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  summary text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.ai_conversations enable row level security;
create policy "Users can manage own conversations" on public.ai_conversations for all using (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS: Auto-update timestamps
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profile_updated before update on public.profiles
  for each row execute function public.handle_updated_at();
create trigger on_permit_updated before update on public.permits
  for each row execute function public.handle_updated_at();
create trigger on_consultation_updated before update on public.consultations
  for each row execute function public.handle_updated_at();
create trigger on_conversation_updated before update on public.ai_conversations
  for each row execute function public.handle_updated_at();

-- ============================================================
-- FUNCTION: Create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- STORAGE: Document vault bucket
-- ============================================================
insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
on conflict do nothing;

create policy "Users can upload own documents" on storage.objects
  for insert with check (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can view own documents" on storage.objects
  for select using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can delete own documents" on storage.objects
  for delete using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);
