-- New gap triggers used by the Shop tab
alter table public.style_gaps drop constraint if exists style_gaps_trigger_check;
alter table public.style_gaps add constraint style_gaps_trigger_check
  check (trigger in ('incomplete_match','formality_ceiling','weather','wear_frequency','laundry_backup','thin_inventory'));

-- Swipe history is read for the 2-day rejected-outfit cooldown
create index if not exists outfit_swipes_reject_idx on public.outfit_swipes (user_id, created_at desc) where decision = 'reject';
