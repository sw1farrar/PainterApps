alter table public.profiles
  add column if not exists is_editor boolean not null default false;

create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  category text not null check (category in ('weather', 'specs', 'industry', 'regulation', 'field')),
  published boolean not null default false,
  published_at timestamptz,
  source_url text,
  title_en text not null,
  title_es text not null default '',
  excerpt_en text not null default '',
  excerpt_es text not null default '',
  body_en text not null,
  body_es text not null default '',
  author_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists news_posts_published_idx
  on public.news_posts (published, published_at desc);

alter table public.news_posts enable row level security;

grant select on table public.news_posts to anon, authenticated;

drop policy if exists "news public read" on public.news_posts;
create policy "news public read" on public.news_posts
  for select
  to anon, authenticated
  using (published = true);

-- Writes go through the service role after an editor check.
