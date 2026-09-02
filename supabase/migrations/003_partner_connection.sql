-- LUNA partner connection system
-- Adds a real, database-backed request + connection flow.
-- Sender (A) looks up a partner by LUNA code, inserts a pending request with
-- receiver_id = B. Receiver (B) queries incoming requests where
-- receiver_id = auth.uid(), then accepts/declines through RPCs that verify
-- ownership and turn the pending request into one shared connection.

-- 1. LUNA codes on profiles -------------------------------------------------

create or replace function public.generate_luna_code()
returns text
language sql
as $$
  select 'LUNA-' ||
    substring('ABCDEFGHJKLMNPQRSTUVWXYZ23456789' from (1 + floor(random() * 33))::int for 1) ||
    substring('ABCDEFGHJKLMNPQRSTUVWXYZ23456789' from (1 + floor(random() * 33))::int for 1) ||
    substring('ABCDEFGHJKLMNPQRSTUVWXYZ23456789' from (1 + floor(random() * 33))::int for 1) ||
    substring('ABCDEFGHJKLMNPQRSTUVWXYZ23456789' from (1 + floor(random() * 33))::int for 1) ||
    substring('ABCDEFGHJKLMNPQRSTUVWXYZ23456789' from (1 + floor(random() * 33))::int for 1) ||
    substring('ABCDEFGHJKLMNPQRSTUVWXYZ23456789' from (1 + floor(random() * 33))::int for 1);
$$;

alter table public.profiles add column if not exists luna_code text;

create unique index if not exists profiles_luna_code_key on public.profiles (luna_code);

-- Backfill existing profiles with unique codes.
do $$
declare
  profile_row record;
  code text;
  attempts int;
begin
  for profile_row in select id from public.profiles where luna_code is null loop
    attempts := 0;
    loop
      code := public.generate_luna_code();
      begin
        update public.profiles set luna_code = code where id = profile_row.id and luna_code is null;
        exit when found;
      exception when unique_violation then
        attempts := attempts + 1;
        if attempts > 20 then
          raise exception 'Could not assign a unique LUNA code for profile %', profile_row.id;
        end if;
      end;
    end loop;
  end loop;
end $$;

alter table public.profiles alter column luna_code set not null;

-- New signups get a LUNA code assigned by the profile trigger.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare
  code text;
begin
  loop
    code := public.generate_luna_code();
    begin
      insert into public.profiles (id, display_name, luna_code)
      values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''), code);
      return new;
    exception when unique_violation then
      null; -- code collision; retry with a fresh code
    end;
  end loop;
end $$;

-- Make sure the trigger exists even on a fresh project that only ran this file.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Returns the calling user's own LUNA code, generating one if missing.
create or replace function public.ensure_my_luna_code()
returns text
language plpgsql security definer set search_path = public
as $$
declare
  current_uid uuid := auth.uid();
  code text;
begin
  if current_uid is null then
    return null;
  end if;

  select p.luna_code into code from public.profiles p where p.id = current_uid;
  if code is not null then
    return code;
  end if;

  loop
    code := public.generate_luna_code();
    begin
      update public.profiles set luna_code = code where id = current_uid and luna_code is null;
      exit when found;
    exception when unique_violation then
      null;
    end;
  end loop;

  return code;
end;
$$;

-- Resolves a LUNA code to a profile. Exposes only the non-wellness fields a
-- connection needs. RLS hides the profiles table from other users, so this
-- security-definer function is the deliberate minimal lookup window.
create or replace function public.lookup_partner_by_code(target_code text)
returns table (id uuid, display_name text, luna_code text)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  return query
    select p.id, p.display_name, p.luna_code
    from public.profiles p
    where p.luna_code = target_code
    limit 1;
end;
$$;

-- Public face of a partner profile (display name + LUNA code only).
create or replace function public.partner_public_profile(target_uid uuid)
returns table (id uuid, display_name text, luna_code text)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  return query
    select p.id, p.display_name, p.luna_code
    from public.profiles p
    where p.id = target_uid
    limit 1;
end;
$$;

-- 3. partner_requests --------------------------------------------------------

create table if not exists public.partner_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint partner_requests_no_self check (sender_id <> receiver_id)
);

create index if not exists partner_requests_receiver_status_idx on public.partner_requests (receiver_id, status);
create index if not exists partner_requests_sender_status_idx on public.partner_requests (sender_id, status);

-- At most one pending request between a pair, in either direction.
create unique index if not exists partner_requests_pending_pair_idx
  on public.partner_requests (least(sender_id, receiver_id), greatest(sender_id, receiver_id))
  where status = 'pending';

drop trigger if exists partner_requests_set_updated_at on public.partner_requests;
create trigger partner_requests_set_updated_at before update on public.partner_requests for each row execute procedure public.set_updated_at();

-- 4. partner_connections -----------------------------------------------------

create table if not exists public.partner_connections (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'connected' check (status in ('connected','disconnected')),
  created_at timestamptz not null default timezone('utc', now()),
  constraint partner_connections_ordered check (user_a_id < user_b_id),
  constraint partner_connections_pair_key unique (user_a_id, user_b_id)
);

create index if not exists partner_connections_members_status_idx on public.partner_connections (user_a_id, user_b_id, status);

-- 5. RLS ---------------------------------------------------------------------

alter table public.partner_requests enable row level security;
alter table public.partner_connections enable row level security;

drop policy if exists partner_requests_select on public.partner_requests;
create policy partner_requests_select on public.partner_requests
  for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists partner_requests_insert on public.partner_requests;
create policy partner_requests_insert on public.partner_requests
  for insert to authenticated
  with check (auth.uid() = sender_id);

-- Updates (accept/decline/cancel/disconnect) happen only through the RPCs
-- below, which verify the caller is a participant. No direct update policy.

drop policy if exists partner_connections_select on public.partner_connections;
create policy partner_connections_select on public.partner_connections
  for select to authenticated
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

-- 6. Atomic accept (pending request -> one shared connection) ----------------

create or replace function public.accept_partner_request(request_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  current_uid uuid := auth.uid();
  req_row public.partner_requests%rowtype;
  conn_row public.partner_connections%rowtype;
  a uuid;
  b uuid;
begin
  if current_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Lock the request row so double acceptance cannot race.
  select * into req_row from public.partner_requests where id = request_id for update;
  if not found then
    raise exception 'Connection request not found' using errcode = 'P0001';
  end if;
  if req_row.receiver_id <> current_uid then
    raise exception 'This request was not sent to you' using errcode = 'P0001';
  end if;
  if req_row.status <> 'pending' then
    raise exception 'This request is no longer pending' using errcode = 'P0001';
  end if;

  update public.partner_requests
     set status = 'accepted', updated_at = timezone('utc', now())
   where id = request_id;

  -- Exactly one canonical row per unordered pair; the unique constraint makes
  -- a second acceptance a no-op rather than a duplicate connection.
  a := least(req_row.sender_id, req_row.receiver_id);
  b := greatest(req_row.sender_id, req_row.receiver_id);
  insert into public.partner_connections (user_a_id, user_b_id, status)
  values (a, b, 'connected')
  on conflict (user_a_id, user_b_id) do nothing;

  select * into conn_row from public.partner_connections
   where user_a_id = a and user_b_id = b and status = 'connected'
   limit 1;

  return jsonb_build_object(
    'request_id', request_id,
    'connection_id', conn_row.id,
    'user_a_id', conn_row.user_a_id,
    'user_b_id', conn_row.user_b_id,
    'status', conn_row.status
  );
end;
$$;

create or replace function public.decline_partner_request(request_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  current_uid uuid := auth.uid();
  req_row public.partner_requests%rowtype;
begin
  if current_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into req_row from public.partner_requests where id = request_id for update;
  if not found then
    raise exception 'Connection request not found' using errcode = 'P0001';
  end if;
  if req_row.receiver_id <> current_uid then
    raise exception 'This request was not sent to you' using errcode = 'P0001';
  end if;
  if req_row.status <> 'pending' then
    raise exception 'This request is no longer pending' using errcode = 'P0001';
  end if;

  update public.partner_requests set status = 'declined', updated_at = timezone('utc', now()) where id = request_id;
  return jsonb_build_object('request_id', request_id, 'status', 'declined');
end;
$$;

create or replace function public.cancel_partner_request(request_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  current_uid uuid := auth.uid();
  req_row public.partner_requests%rowtype;
begin
  if current_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into req_row from public.partner_requests where id = request_id for update;
  if not found then
    raise exception 'Connection request not found' using errcode = 'P0001';
  end if;
  if req_row.sender_id <> current_uid then
    raise exception 'You can only cancel requests you sent' using errcode = 'P0001';
  end if;
  if req_row.status <> 'pending' then
    raise exception 'This request is no longer pending' using errcode = 'P0001';
  end if;

  update public.partner_requests set status = 'cancelled', updated_at = timezone('utc', now()) where id = request_id;
  return jsonb_build_object('request_id', request_id, 'status', 'cancelled');
end;
$$;

create or replace function public.disconnect_partner_connection()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  current_uid uuid := auth.uid();
  conn_row public.partner_connections%rowtype;
begin
  if current_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  update public.partner_connections
     set status = 'disconnected'
   where (user_a_id = current_uid or user_b_id = current_uid)
     and status = 'connected'
   returning * into conn_row;

  if conn_row.id is null then
    raise exception 'No active connection found' using errcode = 'P0001';
  end if;

  return jsonb_build_object('connection_id', conn_row.id, 'status', conn_row.status);
end;
$$;

-- 7. Realtime -----------------------------------------------------------------
-- Members of a pair see their own requests/connections via RLS; Realtime only
-- broadcasts rows the subscribing user is allowed to select.

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.partner_requests;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.partner_connections;
exception when duplicate_object then null;
end $$;