-- Immigration updates tracking system
create table public.immigration_updates (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  summary text not null,
  plain_language text,
  source_url text,
  source_name text not null default 'IRCC',
  is_official boolean not null default true,
  confidence_score integer not null default 100 check (confidence_score between 0 and 100),
  published_at timestamptz,
  detected_at timestamptz not null default now(),
  category text not null check (category in (
    'express_entry_draw', 'processing_time', 'policy_change', 'pgwp_update',
    'pnp_update', 'eligibility_change', 'rule_change', 'levels_plan',
    'category_based_draw', 'general_news', 'transition_rule'
  )),
  urgency text not null default 'normal' check (urgency in ('critical', 'high', 'normal', 'low')),
  affected_groups text[] not null default '{}',
  action_required text,
  diff_snapshot text,
  raw_content text,
  content_hash text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index idx_updates_category on public.immigration_updates(category);
create index idx_updates_detected on public.immigration_updates(detected_at desc);
create index idx_updates_urgency on public.immigration_updates(urgency);
create unique index idx_updates_hash on public.immigration_updates(content_hash);

-- In-app notifications for users
create table public.user_notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  update_id uuid references public.immigration_updates(id) on delete cascade,
  title text not null,
  message text not null,
  category text,
  urgency text not null default 'normal',
  is_read boolean default false,
  action_url text,
  created_at timestamptz default now()
);

alter table public.user_notifications enable row level security;
create policy "Users can read own notifications" on public.user_notifications for select using (auth.uid() = user_id);
create policy "Users can update own notifications" on public.user_notifications for update using (auth.uid() = user_id);

create index idx_notifications_user on public.user_notifications(user_id, is_read, created_at desc);

-- Source tracking for deduplication and freshness
create table public.immigration_sources (
  id uuid primary key default uuid_generate_v4(),
  source_key text unique not null,
  source_url text not null,
  source_name text not null,
  last_fetched_at timestamptz,
  last_content_hash text,
  last_successful_at timestamptz,
  fetch_count integer default 0,
  error_count integer default 0,
  last_error text,
  is_active boolean default true,
  fetch_interval_minutes integer default 60,
  created_at timestamptz default now()
);

-- Document readiness tracking (no file uploads — just checklist)
create table public.document_readiness (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stream text not null,
  document_key text not null,
  has_document boolean default false,
  notes text,
  updated_at timestamptz default now(),
  unique(user_id, stream, document_key)
);

alter table public.document_readiness enable row level security;
create policy "Users can manage own readiness" on public.document_readiness for all using (auth.uid() = user_id);

-- Update profiles for onboarding
alter table public.profiles add column if not exists onboarding_step integer default 0;
alter table public.profiles add column if not exists target_pr_stream text;
alter table public.profiles add column if not exists crs_score integer;
alter table public.profiles add column if not exists notification_preferences jsonb default '{"in_app": true, "email": false}';
