-- Outfit photos the user saved as inspiration (e.g. from Pinterest). Only a small
-- thumbnail and the extracted pieces are stored; they teach the stylist the user's taste.
create table public.style_inspirations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  occasion text,
  pieces jsonb not null,          -- [{category, subcategory, color_hex, color_name, pattern}]
  thumb text,                     -- small data: URL (~10 KB)
  created_at timestamptz not null default now()
);
create index style_inspirations_user_idx on public.style_inspirations (user_id, created_at desc);

alter table public.style_inspirations enable row level security;
create policy "own inspirations" on public.style_inspirations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
