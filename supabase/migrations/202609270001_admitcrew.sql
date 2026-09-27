create table if not exists public.leads (
  id text primary key,
  name text not null,
  phone text not null,
  normalized_phone text not null unique,
  country text not null default '',
  marks text not null default '',
  ielts text not null default '',
  last_reply text not null default 'Today',
  status text not null default 'Active',
  updated_at timestamptz not null default now()
);

create table if not exists public.programs (
  id text primary key,
  university text not null,
  country text not null,
  program text not null,
  fee text not null,
  deadline text not null,
  min_marks text not null,
  min_ielts text not null,
  documents text not null
);

create table if not exists public.approvals (
  id text primary key,
  lead_id text not null,
  lead_name text not null,
  agent text not null,
  message text not null,
  reason text not null,
  status text not null default 'pending',
  send_key text unique,
  created_at timestamptz not null default now(),
  reviewed_by text,
  reviewed_at timestamptz,
  sent_at timestamptz
);
create index if not exists approvals_status_idx on public.approvals(status);

create table if not exists public.documents (
  id text primary key,
  lead_name text not null,
  file_name text not null,
  storage_key text not null,
  type text not null,
  status text not null,
  reason text not null,
  details text not null,
  confidence integer not null default 100,
  checked_at timestamptz not null default now()
);

create table if not exists public.escalations (
  id text primary key,
  lead_id text not null,
  question text not null,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
create index if not exists escalations_status_idx on public.escalations(status);

create table if not exists public.agent_runs (
  id text primary key,
  agent text not null,
  action text not null,
  input_summary text not null,
  output_summary text not null,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id text primary key,
  actor_id text not null,
  actor_name text not null,
  action text not null,
  detail text not null,
  tone text not null default 'blue',
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_at_idx on public.audit_log(created_at desc);

create table if not exists public.staff_users (
  id text primary key,
  email text not null unique,
  name text not null,
  role text not null default 'counselor',
  created_at timestamptz not null default now(),
  constraint staff_role_check check (role in ('admin', 'counselor'))
);

alter table public.leads enable row level security;
alter table public.programs enable row level security;
alter table public.approvals enable row level security;
alter table public.documents enable row level security;
alter table public.escalations enable row level security;
alter table public.agent_runs enable row level security;
alter table public.audit_log enable row level security;
alter table public.staff_users enable row level security;

-- The Data API is deliberately not exposed to public roles. Server-side
-- application code and Edge Functions use only the service role.
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
alter default privileges in schema public grant all privileges on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;

insert into storage.buckets (id, name, public)
values ('admitcrew-documents', 'admitcrew-documents', false)
on conflict (id) do update set public = false;
