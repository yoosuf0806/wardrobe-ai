-- Style quiz results + learned-preference dismissals
alter table public.profiles
  add column style_profile jsonb not null default
  '{"archetypes":{},"palettes":{},"liked_looks":[],"disliked_looks":[],"completed_at":null,"dismissed_learned":[]}'::jsonb;

-- Swipe history (accepts + rejects) is read for preference learning
create index if not exists outfit_swipes_user_all_idx on public.outfit_swipes (user_id, created_at desc);
