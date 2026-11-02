-- Swipe deck, laundry state, clothing sizes, accessories in outfits

-- Sizes for shopping searches: {"top":"M","bottom_waist":32,"bottom_inseam":30,"dress":null,"shoe":"10","shoe_system":"US"}
alter table public.profiles
  add column sizes jsonb not null default '{"top":null,"bottom_waist":null,"bottom_inseam":null,"dress":null,"shoe":null,"shoe_system":"US"}'::jsonb;

-- Laundry: excluded from suggestions while set (the app auto-returns items after 7 days)
alter table public.wardrobe_items add column in_laundry_since timestamptz;

-- Every swipe decision, for future personalisation (which combos users like / reject)
create table public.outfit_swipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  occasion text not null,
  item_ids uuid[] not null,
  decision text not null check (decision in ('accept','reject')),
  round smallint not null default 1,
  created_at timestamptz not null default now()
);
create index outfit_swipes_user_idx on public.outfit_swipes (user_id, created_at desc);

alter table public.outfit_swipes enable row level security;
create policy "own swipes" on public.outfit_swipes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
