grant insert, update, delete on table public.news_posts to authenticated;

drop policy if exists "news editor write" on public.news_posts;
create policy "news editor write"
  on public.news_posts
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = (select auth.uid()) and p.is_editor = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.user_id = (select auth.uid()) and p.is_editor = true
    )
  );
