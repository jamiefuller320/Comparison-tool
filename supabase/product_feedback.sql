-- School Compass product feedback queue + keep-alive ping table.
-- Run the whole file in the Supabase SQL editor (School Compass project only —
-- NOT the home_learning project). Safe to re-run.
--
-- Testers (anon / publishable key): INSERT into product_feedback only.
-- Maintainers (service_role): full CRUD for triage.
-- Keep-alive workflow: anon INSERT + DELETE on supabase_keepalive.
--
-- Client inserts MUST use Prefer: return=minimal. return=representation needs
-- SELECT (which anon does not have) and fails with 401/42501.
--
-- Look at this table in the School Compass Supabase project only — not
-- home_learning. Cursor cloud secrets are shared by name: use
-- SCHOOL_COMPASS_SUPABASE_SERVICE_ROLE_KEY for agents (do not overwrite HL).

-- ---------------------------------------------------------------------------
-- product_feedback
-- ---------------------------------------------------------------------------

create table if not exists public.product_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- intake (from client)
  campaign_id text not null,
  app_version text not null default '',
  trigger text not null,
  sentiment text not null,
  topics text[] not null default '{}',
  note text not null,
  contact_email text,
  adaptive_question text not null default '',
  page_url text not null default '',
  surface text not null default '',
  usage jsonb not null default '{}'::jsonb,
  -- triage (service_role only writes these meaningfully)
  status text not null default 'open'
    check (status in ('open', 'triaged', 'implemented', 'ignored', 'needs_clarification')),
  proposed_action text
    check (proposed_action is null or proposed_action in ('implement', 'ignore', 'needs_clarification')),
  triage_note text not null default '',
  github_issue_url text
);

alter table public.product_feedback enable row level security;

revoke all on table public.product_feedback from anon, authenticated;
grant insert on table public.product_feedback to anon;
grant select, insert, update, delete on table public.product_feedback to service_role;

drop policy if exists product_feedback_anon_insert on public.product_feedback;
create policy product_feedback_anon_insert
  on public.product_feedback for insert to anon
  with check (
    status = 'open'
    and proposed_action is null
    and triage_note = ''
    and github_issue_url is null
    and char_length(note) between 1 and 4000
  );

-- ---------------------------------------------------------------------------
-- supabase_keepalive — real write activity so free-tier pause clock resets
-- ---------------------------------------------------------------------------
-- Empty SELECT under RLS has been unreliable as “activity”. This table allows
-- the keep-alive workflow to INSERT a row then DELETE it with the anon key.

create table if not exists public.supabase_keepalive (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null default 'gha'
);

alter table public.supabase_keepalive enable row level security;

revoke all on table public.supabase_keepalive from anon, authenticated;
grant insert, select, delete on table public.supabase_keepalive to anon;
grant select, insert, update, delete on table public.supabase_keepalive to service_role;

drop policy if exists supabase_keepalive_anon_insert on public.supabase_keepalive;
create policy supabase_keepalive_anon_insert
  on public.supabase_keepalive for insert to anon
  with check (char_length(source) between 1 and 80);

drop policy if exists supabase_keepalive_anon_select on public.supabase_keepalive;
create policy supabase_keepalive_anon_select
  on public.supabase_keepalive for select to anon
  using (true);

drop policy if exists supabase_keepalive_anon_delete on public.supabase_keepalive;
create policy supabase_keepalive_anon_delete
  on public.supabase_keepalive for delete to anon
  using (true);
