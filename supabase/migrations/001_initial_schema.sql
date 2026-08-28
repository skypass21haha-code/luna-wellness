create extension if not exists pgcrypto;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = timezone('utc', now()); return new; end; $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  timezone text not null default 'UTC',
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.cycle_logs (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, logged_on date not null, cycle_day integer, notes text, created_at timestamptz not null default timezone('utc', now()), unique(user_id, logged_on));
create table if not exists public.period_logs (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, start_date date not null, end_date date, spotting boolean not null default false, flow text check (flow in ('spotting','light','medium','heavy')), pain integer check (pain between 0 and 10), notes text, created_at timestamptz not null default timezone('utc', now()));
create table if not exists public.symptoms (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null, is_custom boolean not null default false, created_at timestamptz not null default timezone('utc', now()), unique(user_id, name));
create table if not exists public.symptom_logs (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, symptom_id uuid not null references public.symptoms(id) on delete cascade, logged_on date not null, severity integer not null check (severity between 0 and 10), notes text, created_at timestamptz not null default timezone('utc', now()));
create table if not exists public.mood_logs (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, logged_on date not null, mood text not null, energy integer check (energy between 0 and 10), pain integer check (pain between 0 and 10), notes text, created_at timestamptz not null default timezone('utc', now()), unique(user_id, logged_on));
create table if not exists public.stress_logs (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, logged_on date not null, stress integer not null check (stress between 0 and 10), created_at timestamptz not null default timezone('utc', now()), unique(user_id, logged_on));
create table if not exists public.sleep_logs (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, logged_on date not null, duration_minutes integer check (duration_minutes between 0 and 1440), quality text check (quality in ('Poor','Fair','Good','Excellent')), bedtime timestamptz, wake_time timestamptz, notes text, created_at timestamptz not null default timezone('utc', now()), unique(user_id, logged_on));
create table if not exists public.medications (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null, strength text, purpose text, instructions text, start_date date, end_date date, active boolean not null default true, notes text, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()));
create table if not exists public.medication_schedules (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, medication_id uuid not null references public.medications(id) on delete cascade, schedule_type text not null, times time[] not null default '{}', selected_days smallint[], created_at timestamptz not null default timezone('utc', now()));
create table if not exists public.reminders (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, medication_id uuid not null references public.medications(id) on delete cascade, schedule_id uuid not null references public.medication_schedules(id) on delete cascade, scheduled_at timestamptz not null, triggered_at timestamptz, completed_at timestamptz, status text not null default 'scheduled' check (status in ('scheduled','triggered','taken','snoozed','skipped','missed')), created_at timestamptz not null default timezone('utc', now()));
create table if not exists public.medication_logs (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, medication_id uuid not null references public.medications(id) on delete cascade, reminder_id uuid references public.reminders(id) on delete set null, logged_at timestamptz not null default timezone('utc', now()), status text not null check (status in ('taken','skipped','missed','snoozed')), unique(reminder_id, status));
create table if not exists public.journal_entries (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, entry_date date not null default current_date, title text not null default '', content text not null, tags text[] not null default '{}', created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()));
create table if not exists public.affirmations (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, message text not null, active boolean not null default true, created_at timestamptz not null default timezone('utc', now()));
create table if not exists public.wellness_logs (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, logged_on date not null, category text not null, value jsonb not null default '{}', notes text, created_at timestamptz not null default timezone('utc', now()));
create table if not exists public.notification_preferences (user_id uuid primary key references auth.users(id) on delete cascade, medication boolean not null default true, wellness boolean not null default true, affirmations boolean not null default true, daily_checkin boolean not null default true, private_text boolean not null default true, updated_at timestamptz not null default timezone('utc', now()));
create table if not exists public.user_settings (user_id uuid primary key references auth.users(id) on delete cascade, theme text not null default 'system' check (theme in ('light','dark','system')), session_timeout_minutes integer, updated_at timestamptz not null default timezone('utc', now()));
create table if not exists public.partner_permissions (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, partner_email text not null, cycle boolean not null default false, mood boolean not null default false, symptoms boolean not null default false, medication_status boolean not null default false, wellness boolean not null default false, support_messages boolean not null default true, revoked_at timestamptz, created_at timestamptz not null default timezone('utc', now()));
create table if not exists public.partner_messages (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, sender_id uuid not null references auth.users(id) on delete cascade, body text not null, created_at timestamptz not null default timezone('utc', now()));
create table if not exists public.audit_logs (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, action text not null, resource_type text, resource_id uuid, created_at timestamptz not null default timezone('utc', now()));

create index if not exists cycle_logs_user_date_idx on public.cycle_logs(user_id, logged_on desc);
create index if not exists symptom_logs_user_date_idx on public.symptom_logs(user_id, logged_on desc);
create index if not exists reminders_user_status_idx on public.reminders(user_id, status, scheduled_at);
create index if not exists medication_logs_user_date_idx on public.medication_logs(user_id, logged_at desc);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name','')); return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.cycle_logs enable row level security;
alter table public.period_logs enable row level security;
alter table public.symptoms enable row level security;
alter table public.symptom_logs enable row level security;
alter table public.mood_logs enable row level security;
alter table public.stress_logs enable row level security;
alter table public.sleep_logs enable row level security;
alter table public.medications enable row level security;
alter table public.medication_schedules enable row level security;
alter table public.reminders enable row level security;
alter table public.medication_logs enable row level security;
alter table public.journal_entries enable row level security;
alter table public.affirmations enable row level security;
alter table public.wellness_logs enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.user_settings enable row level security;
alter table public.partner_permissions enable row level security;
alter table public.partner_messages enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists profiles_owner on public.profiles;
create policy profiles_owner on public.profiles for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

do $$ declare table_name text; begin for table_name in select unnest(array['cycle_logs','period_logs','symptoms','symptom_logs','mood_logs','stress_logs','sleep_logs','medications','medication_schedules','reminders','medication_logs','journal_entries','affirmations','wellness_logs','notification_preferences','user_settings','partner_permissions','partner_messages','audit_logs']) loop execute format('drop policy if exists %I_owner on public.%I', table_name, table_name); execute format('create policy %I_owner on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', table_name, table_name); end loop; end $$;
