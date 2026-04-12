-- PR Application tracking for users who have already applied
create table public.pr_applications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  program text not null check (program in (
    'cec', 'fsw', 'fst', 'pnp', 'pnp_ee', 'sponsorship', 'atlantic', 'rural', 'other'
  )),
  application_number text,
  submission_date date,
  aor_date date,
  biometrics_date date,
  biometrics_done boolean default false,
  medical_exam_date date,
  medical_passed boolean default false,
  background_check_started date,
  additional_docs_requested boolean default false,
  additional_docs_submitted date,
  gcms_notes_ordered boolean default false,
  ita_date date,
  ita_crs_score integer,
  noc_code_applied text,
  province_applied text,
  pnp_stream text,
  current_stage text not null default 'submitted' check (current_stage in (
    'profile_created', 'ita_received', 'submitted', 'aor_received',
    'biometrics_requested', 'medical_requested', 'background_check',
    'additional_docs', 'decision_made', 'approved', 'refused', 'withdrawn'
  )),
  decision_date date,
  decision_result text check (decision_result in ('approved', 'refused', 'withdrawn', null)),
  copr_date date,
  pr_card_date date,
  landing_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.pr_applications enable row level security;
create policy "Users can manage own PR applications" on public.pr_applications for all using (auth.uid() = user_id);

create trigger on_pr_application_updated before update on public.pr_applications
  for each row execute function public.handle_updated_at();

-- Add has_applied_pr flag to profiles
alter table public.profiles add column if not exists has_applied_pr boolean default false;
alter table public.profiles add column if not exists pr_application_program text;
