create table if not exists public.mcp_access_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  token_hash text not null unique,
  token_prefix text not null,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists idx_mcp_access_tokens_user_active
  on public.mcp_access_tokens (user_id, created_at desc)
  where revoked_at is null;

alter table public.mcp_access_tokens enable row level security;
