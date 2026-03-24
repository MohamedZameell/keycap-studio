-- Keycap Studio Database Schema
-- Run this in Supabase SQL Editor (supabase.com → your project → SQL Editor)

-- 1. PROFILES TABLE (linked to auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. DESIGNS TABLE (public gallery)
create table if not exists public.designs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete set null,
  name text not null,
  color text default '#6c63ff',
  legend_color text default '#ffffff',
  keyboard text,
  theme text default 'Community',
  font text default 'Inter',
  material text default 'abs',
  profile text,
  per_key_designs jsonb default '{}',
  images jsonb default '[]',
  likes int default 0,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.designs enable row level security;

-- Designs policies
create policy "Public designs are viewable by everyone"
  on public.designs for select using (true);

create policy "Authenticated users can insert designs"
  on public.designs for insert with check (auth.role() = 'authenticated');

create policy "Users can update own designs"
  on public.designs for update using (auth.uid() = user_id);

create policy "Users can delete own designs"
  on public.designs for delete using (auth.uid() = user_id);


-- 3. USER_DESIGNS TABLE (private saved designs)
create table if not exists public.user_designs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  color text default '#6c63ff',
  legend_color text default '#ffffff',
  keyboard text,
  font text default 'Inter',
  material text default 'abs',
  profile text,
  per_key_designs jsonb default '{}',
  images jsonb default '[]',
  is_favorite boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.user_designs enable row level security;

-- User designs policies (private - only owner can access)
create policy "Users can view own designs"
  on public.user_designs for select using (auth.uid() = user_id);

create policy "Users can insert own designs"
  on public.user_designs for insert with check (auth.uid() = user_id);

create policy "Users can update own designs"
  on public.user_designs for update using (auth.uid() = user_id);

create policy "Users can delete own designs"
  on public.user_designs for delete using (auth.uid() = user_id);


-- 4. DESIGN_LIKES TABLE (track who liked what)
create table if not exists public.design_likes (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  design_id bigint references public.designs on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, design_id)
);

-- Enable RLS
alter table public.design_likes enable row level security;

create policy "Users can view all likes"
  on public.design_likes for select using (true);

create policy "Users can insert own likes"
  on public.design_likes for insert with check (auth.uid() = user_id);

create policy "Users can delete own likes"
  on public.design_likes for delete using (auth.uid() = user_id);


-- 5. INDEXES for performance
create index if not exists designs_likes_idx on public.designs(likes desc);
create index if not exists designs_created_idx on public.designs(created_at desc);
create index if not exists user_designs_user_idx on public.user_designs(user_id);
create index if not exists design_likes_design_idx on public.design_likes(design_id);
