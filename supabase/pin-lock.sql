-- PIN lock for Arman's Job Application Tracker.
--
-- Why this exists: the applications table used to be readable and editable by
-- anyone holding the site's public (anon) key, because row-level security was
-- off. Now RLS is on with no policies and the anon/authenticated roles have no
-- direct table rights, so the only way in is through the functions below.
--
-- How it works:
--   * The PIN is checked here, in the database, never in the browser.
--   * Only a bcrypt hash of the PIN is stored (tracker_secret.pin_hash).
--   * The PIN can be set once, the first time the tracker is opened.
--   * A correct PIN returns a random session token. Only its SHA-256 hash is
--     stored; sessions last 30 days and "Lock" ends one.
--   * Every 5 wrong PINs in a row lock the tracker; the lock doubles each time
--     (15 min, 30 min, 1 h, ... up to 24 h). A correct PIN resets the count.
--
-- Re-runnable: safe to paste and run again.

create table if not exists public.tracker_secret (
  id           int primary key default 1 check (id = 1),
  pin_hash     text not null,
  pin_set_at   timestamptz not null default now(),
  failed       int not null default 0,
  locked_until timestamptz
);

create table if not exists public.tracker_sessions (
  token_hash text primary key,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.applications     enable row level security;
alter table public.tracker_secret   enable row level security;
alter table public.tracker_sessions enable row level security;

revoke all on public.applications, public.tracker_secret, public.tracker_sessions
  from public, anon, authenticated;

-- Internal: true when the token belongs to a live session.
create or replace function public.tracker_session_ok(p_token text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select p_token is not null and exists (
    select 1 from public.tracker_sessions
    where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
      and expires_at > now()
  );
$$;

create or replace function public.tracker_new_session()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  delete from public.tracker_sessions where expires_at <= now();
  insert into public.tracker_sessions (token_hash, expires_at)
  values (encode(extensions.digest(v_token, 'sha256'), 'hex'), now() + interval '30 days');
  return v_token;
end;
$$;

-- Public: is a PIN set yet, and is the tracker locked out right now?
create or replace function public.tracker_status()
returns json
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select json_build_object(
    'pin_set', exists (select 1 from public.tracker_secret),
    'locked_until', (select case when locked_until > now() then locked_until end
                     from public.tracker_secret)
  );
$$;

-- Public: set the PIN, only when none exists. 6 to 12 digits.
create or replace function public.tracker_set_pin(p_pin text)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_pin is null or p_pin !~ '^[0-9]{6,12}$' then
    return json_build_object('ok', false, 'error', 'The PIN must be 6 to 12 digits.');
  end if;
  insert into public.tracker_secret (id, pin_hash)
  values (1, extensions.crypt(p_pin, extensions.gen_salt('bf', 10)))
  on conflict (id) do nothing;
  if not found then
    return json_build_object('ok', false, 'error', 'A PIN is already set.');
  end if;
  return json_build_object('ok', true, 'token', public.tracker_new_session());
end;
$$;

-- Public: unlock with the PIN. Returns a token, or the lockout time.
-- Returns json rather than raising, so failed tries are recorded.
create or replace function public.tracker_unlock(p_pin text)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  s public.tracker_secret%rowtype;
  v_fails int;
  v_until timestamptz;
begin
  select * into s from public.tracker_secret where id = 1 for update;
  if not found then
    return json_build_object('ok', false, 'error', 'No PIN is set yet.');
  end if;
  if s.locked_until > now() then
    return json_build_object('ok', false, 'error', 'Too many wrong tries.',
                             'locked_until', s.locked_until);
  end if;
  if p_pin is not null and extensions.crypt(p_pin, s.pin_hash) = s.pin_hash then
    update public.tracker_secret set failed = 0, locked_until = null where id = 1;
    return json_build_object('ok', true, 'token', public.tracker_new_session());
  end if;

  v_fails := s.failed + 1;
  if v_fails % 5 = 0 then
    v_until := now() + least(interval '15 minutes' * power(2, v_fails / 5 - 1),
                             interval '24 hours');
  end if;
  update public.tracker_secret set failed = v_fails, locked_until = v_until where id = 1;
  if v_until is not null then
    return json_build_object('ok', false, 'error', 'Too many wrong tries.',
                             'locked_until', v_until);
  end if;
  return json_build_object('ok', false, 'error', 'Wrong PIN.',
                           'tries_left', 5 - v_fails % 5);
end;
$$;

create or replace function public.tracker_lock(p_token text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.tracker_sessions
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

create or replace function public.tracker_list(p_token text)
returns setof public.applications
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
begin
  if not public.tracker_session_ok(p_token) then
    raise exception 'locked' using errcode = '28000';
  end if;
  return query select * from public.applications order by created_at desc;
end;
$$;

create or replace function public.tracker_add(
  p_token text, p_company text, p_role text, p_status text,
  p_date_applied date, p_notes text)
returns public.applications
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r public.applications;
begin
  if not public.tracker_session_ok(p_token) then
    raise exception 'locked' using errcode = '28000';
  end if;
  insert into public.applications (company, role, status, date_applied, notes)
  values (p_company, p_role, p_status, p_date_applied, nullif(p_notes, ''))
  returning * into r;
  return r;
end;
$$;

create or replace function public.tracker_set_status(p_token text, p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.tracker_session_ok(p_token) then
    raise exception 'locked' using errcode = '28000';
  end if;
  update public.applications set status = p_status where id = p_id;
end;
$$;

create or replace function public.tracker_delete(p_token text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.tracker_session_ok(p_token) then
    raise exception 'locked' using errcode = '28000';
  end if;
  delete from public.applications where id = p_id;
end;
$$;

-- Grant nothing by default: Postgres gives EXECUTE to PUBLIC on new functions.
revoke all on function
  public.tracker_session_ok(text),
  public.tracker_new_session(),
  public.tracker_status(),
  public.tracker_set_pin(text),
  public.tracker_unlock(text),
  public.tracker_lock(text),
  public.tracker_list(text),
  public.tracker_add(text, text, text, text, date, text),
  public.tracker_set_status(text, uuid, text),
  public.tracker_delete(text, uuid)
from public, anon, authenticated;

grant execute on function
  public.tracker_status(),
  public.tracker_set_pin(text),
  public.tracker_unlock(text),
  public.tracker_lock(text),
  public.tracker_list(text),
  public.tracker_add(text, text, text, text, date, text),
  public.tracker_set_status(text, uuid, text),
  public.tracker_delete(text, uuid)
to anon, authenticated;

-- Proof: 0 policies on applications, RLS on for all three tables,
-- and exactly 8 functions callable by anon.
select
  (select count(*) from pg_policies where tablename = 'applications') as policies,
  (select bool_and(relrowsecurity) from pg_class
    where oid in ('public.applications'::regclass, 'public.tracker_secret'::regclass,
                  'public.tracker_sessions'::regclass)) as rls_on,
  (select count(*) from information_schema.routine_privileges
    where grantee = 'anon' and routine_name like 'tracker\_%') as anon_functions;
