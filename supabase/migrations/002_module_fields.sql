-- Additive fields required by the functional module screens.
alter table public.journal_entries add column if not exists mood text;
alter table public.reminders add column if not exists reminder_enabled boolean not null default true;
alter table public.medication_schedules add column if not exists reminder_enabled boolean not null default true;

drop trigger if exists medications_set_updated_at on public.medications;
create trigger medications_set_updated_at before update on public.medications for each row execute procedure public.set_updated_at();
drop trigger if exists journal_entries_set_updated_at on public.journal_entries;
create trigger journal_entries_set_updated_at before update on public.journal_entries for each row execute procedure public.set_updated_at();

create index if not exists period_logs_user_start_idx on public.period_logs(user_id, start_date desc);
create index if not exists journal_entries_user_date_idx on public.journal_entries(user_id, entry_date desc);
