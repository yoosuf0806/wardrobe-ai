-- SmartStylist initial schema
-- Changes vs. the original brief are called out with  -- [CHANGE]

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  body_shape text check (body_shape in ('hourglass','rectangle','inverted_triangle','pear','oval')),
  body_shape_source text check (body_shape_source in ('detected','manual')),           -- [CHANGE] know if user overrode the classifier
  body_metrics jsonb,                                                                    -- [CHANGE] ratios only; the photo is never stored
  fit_preferences jsonb not null default '{
    "allow_slim_fit": null, "allow_oversized": null, "allow_cropped_tops": null,
    "allow_horizontal_stripes": null, "allow_bold_patterns": null,
    "preferred_sleeves": [], "avoid_colors": [], "avoid_patterns": [],
    "disabled_rules": [], "notes": ""
  }'::jsonb,
  budget jsonb not null default '{"max_per_item": 150, "currency": "USD"}'::jsonb,
  department text not null default 'unisex' check (department in ('womens','mens','unisex')), -- [CHANGE] needed for shopping queries
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row for every new auth user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Wardrobe items
-- ---------------------------------------------------------------------------
create table public.wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  image_path text,                                 -- [CHANGE] storage path in private bucket (signed URLs), not a public URL
  category text not null check (category in ('top','bottom','one_piece','footwear','outerwear','accessory')), -- [CHANGE] + one_piece (dresses/jumpsuits); 'footwear' unified
  subcategory text not null default '',
  color_hex varchar(7) not null check (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  color_name text not null default '',
  secondary_colors text[] not null default '{}',
  pattern text not null default 'solid',
  fabric_type text not null default '',
  fabric_weight text not null default 'medium' check (fabric_weight in ('light','medium','heavy')),
  sleeve_length text not null default 'none',
  fit text not null default 'regular' check (fit in ('slim','regular','relaxed','oversized')),        -- [CHANGE] needed for fit overrides
  length text not null default 'regular' check (length in ('cropped','regular','longline')),          -- [CHANGE] needed for "never cropped"
  formality smallint not null check (formality between 1 and 10),
  seasonality text[] not null default '{}',        -- [CHANGE] was in the JSON contract but missing from the table
  waterproof boolean not null default false,
  item_embedding vector(512),
  ai_raw jsonb,                                    -- raw model output for audit / re-processing
  wear_count integer not null default 0,
  last_worn_at timestamptz,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index wardrobe_items_user_idx on public.wardrobe_items (user_id) where not archived;
create index wardrobe_items_embedding_idx on public.wardrobe_items
  using hnsw (item_embedding vector_cosine_ops);

-- Visual similarity search within a user's own wardrobe (RLS still applies: security invoker).
create or replace function public.match_wardrobe_items(query_embedding vector(512), match_count int default 5)
returns table (id uuid, similarity float)
language sql stable security invoker as $$
  select w.id, 1 - (w.item_embedding <=> query_embedding) as similarity
  from public.wardrobe_items w
  where w.user_id = auth.uid() and w.item_embedding is not null and not w.archived
  order by w.item_embedding <=> query_embedding
  limit match_count;
$$;

-- ---------------------------------------------------------------------------
-- Outfit logs
-- ---------------------------------------------------------------------------
create table public.outfit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  occasion text not null,
  item_ids uuid[] not null,                        -- [CHANGE] uuid[] instead of JSONB: indexable, typed
  weather jsonb,
  stylist_note text,
  feedback smallint check (feedback between 1 and 5),
  worn_on date not null default current_date,      -- [CHANGE] needed for wear-frequency analysis
  created_at timestamptz not null default now()    -- [CHANGE] was missing
);
create index outfit_logs_user_date_idx on public.outfit_logs (user_id, worn_on desc);

-- Keep wear counters in sync when an outfit is logged as worn.
create or replace function public.bump_wear_counts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.wardrobe_items
     set wear_count = wear_count + 1, last_worn_at = now()
   where id = any(new.item_ids) and user_id = new.user_id;
  return new;
end $$;

create trigger outfit_logs_bump_wear
  after insert on public.outfit_logs
  for each row execute function public.bump_wear_counts();

-- ---------------------------------------------------------------------------
-- Gap analysis + shopping suggestions                                  [CHANGE] new
-- ---------------------------------------------------------------------------
create table public.style_gaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  trigger text not null check (trigger in ('incomplete_match','formality_ceiling','weather','wear_frequency')),
  occasion text,
  spec jsonb not null,           -- {category, subcategory, color_hex, color_name, formality, max_price, currency, query}
  urgency real not null default 0.5,
  status text not null default 'open' check (status in ('open','dismissed','purchased')),
  created_at timestamptz not null default now()
);

create table public.product_suggestions (
  id uuid primary key default gen_random_uuid(),
  gap_id uuid not null references public.style_gaps (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  merchant text,
  price numeric(10,2),
  currency text,
  url text not null,
  image_url text,
  score real not null,
  provider text not null,
  fetched_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security: every row is owned by exactly one user
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.wardrobe_items enable row level security;
alter table public.outfit_logs enable row level security;
alter table public.style_gaps enable row level security;
alter table public.product_suggestions enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own items" on public.wardrobe_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own logs" on public.outfit_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own gaps" on public.style_gaps
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own suggestions" on public.product_suggestions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage: private bucket, objects namespaced by user id  ({uid}/{file})
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('wardrobe', 'wardrobe', false)
on conflict (id) do nothing;

create policy "wardrobe read own" on storage.objects for select
  using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "wardrobe write own" on storage.objects for insert
  with check (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "wardrobe delete own" on storage.objects for delete
  using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);
