-- Run this in the Supabase SQL editor for your project.

create table if not exists pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  brand text,
  quantity numeric not null default 1,
  quantity_unit text default 'ct',
  serving_qty numeric,
  serving_unit text,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  fiber_g numeric,
  sugar_g numeric,
  sodium_mg numeric,
  source text default 'manual', -- 'calorieapi' | 'openfoodfacts' | 'usda' | 'manual'
  created_at timestamptz not null default now()
);

alter table pantry_items enable row level security;

create policy "Users can view their own pantry items"
  on pantry_items for select
  using (auth.uid() = user_id);

create policy "Users can insert their own pantry items"
  on pantry_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own pantry items"
  on pantry_items for update
  using (auth.uid() = user_id);

create policy "Users can delete their own pantry items"
  on pantry_items for delete
  using (auth.uid() = user_id);

create index if not exists pantry_items_user_id_idx on pantry_items (user_id);

-- ============================================================
-- Saved / favorited recipes (Phase 2)
-- ============================================================

create table if not exists saved_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id integer not null,
  title text not null,
  image text,
  ready_in_minutes integer,
  source_url text,
  created_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);

alter table saved_recipes enable row level security;

create policy "Users can view their own saved recipes"
  on saved_recipes for select
  using (auth.uid() = user_id);

create policy "Users can save their own recipes"
  on saved_recipes for insert
  with check (auth.uid() = user_id);

create policy "Users can remove their own saved recipes"
  on saved_recipes for delete
  using (auth.uid() = user_id);

create index if not exists saved_recipes_user_id_idx on saved_recipes (user_id);

