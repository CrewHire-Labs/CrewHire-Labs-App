-- ============================================================
-- CREWHIRE LABS — SUPABASE DATABASE SCHEMA
-- Run this entire file in Supabase SQL Editor
-- Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- Enable pgvector extension for Brand Brain embeddings
create extension if not exists vector;

-- ============================================================
-- BRANDS TABLE
-- One row per brand/business signed up
-- ============================================================
create table if not exists brands (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  name          text not null,
  tagline       text,
  website       text,
  shopify_url   text,
  industry      text default 'd2c',
  geo           text default 'IN',        -- IN or GLOBAL
  plan          text default 'trial',     -- trial | starter | growth | scale | enterprise
  trial_ends_at timestamptz default (now() + interval '7 days'),
  onboarded     boolean default false,    -- true after wizard complete
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- BRAND DETAILS TABLE
-- All the brand data collected in the onboarding wizard
-- ============================================================
create table if not exists brand_details (
  id             uuid primary key default gen_random_uuid(),
  brand_id       uuid references brands(id) on delete cascade not null unique,
  -- Step 1: Brand basics
  brand_tone     text,                    -- e.g. "Friendly, premium, playful"
  target_audience text,                  -- e.g. "Women 25-35, skincare enthusiasts"
  usp            text,                   -- Unique selling proposition
  -- Step 2: Products
  product_catalog text,                  -- Raw text / CSV of products
  price_range    text,                   -- e.g. "₹500–₹3000"
  bestsellers    text,                   -- Top 3-5 products
  -- Step 3: Customers
  avg_order_value text,
  repeat_rate    text,
  top_complaints text,
  -- Step 4: Operations
  return_policy  text,
  shipping_info  text,
  faq_text       text,                   -- Raw FAQ content
  -- Step 5: Goals
  primary_goal   text,                   -- e.g. "Increase retention"
  monthly_revenue text,
  team_size      text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ============================================================
-- BRAND BRAIN CHUNKS TABLE
-- Stores embedded chunks of brand data for vector search
-- Used by AI agents to retrieve relevant brand context
-- ============================================================
create table if not exists brand_chunks (
  id         uuid primary key default gen_random_uuid(),
  brand_id   uuid references brands(id) on delete cascade not null,
  content    text not null,              -- The chunk text
  source     text not null,             -- e.g. 'faq', 'products', 'tone', 'policy'
  embedding  vector(768),               -- Gemini text-embedding-004 = 768 dims
  created_at timestamptz default now()
);

-- Index for fast cosine similarity search
create index if not exists brand_chunks_embedding_idx
  on brand_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

-- ============================================================
-- EMPLOYEES TABLE
-- AI agents hired per brand
-- ============================================================
create table if not exists employees (
  id           uuid primary key default gen_random_uuid(),
  brand_id     uuid references brands(id) on delete cascade not null,
  name         text not null,            -- e.g. "Sana"
  role         text not null,            -- e.g. "sales" | "retention" | "content" etc
  team         text not null,            -- revenue | marketing | growth | ops
  status       text default 'inactive',  -- inactive | active | idle | paused
  phase        integer default 1,        -- 1 = available, 2 = phase 2, 3 = phase 3
  config       jsonb default '{}',       -- agent-specific config
  hired_at     timestamptz,
  last_active  timestamptz,
  created_at   timestamptz default now()
);

-- ============================================================
-- AGENT TASKS TABLE
-- Log of everything each agent has done
-- ============================================================
create table if not exists agent_tasks (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid references brands(id) on delete cascade not null,
  employee_id uuid references employees(id) on delete cascade not null,
  type        text not null,             -- e.g. 'upsell', 'content', 'briefing'
  status      text default 'completed',  -- pending | running | completed | failed
  result      text,                      -- What the agent did / output
  metadata    jsonb default '{}',
  ran_at      timestamptz default now()
);

-- ============================================================
-- WAITLIST TABLE
-- Stores waitlist signups from landing page
-- ============================================================
create table if not exists waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  brand_name text,
  geo        text default 'IN',
  source     text default 'landing',
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Users can only access their own brand's data
-- ============================================================

-- Brands: user sees only their own brands
alter table brands enable row level security;
create policy "brands_own" on brands
  for all using (auth.uid() = user_id);

-- Brand details: access via brand ownership
alter table brand_details enable row level security;
create policy "brand_details_own" on brand_details
  for all using (
    brand_id in (select id from brands where user_id = auth.uid())
  );

-- Brand chunks: access via brand ownership
alter table brand_chunks enable row level security;
create policy "brand_chunks_own" on brand_chunks
  for all using (
    brand_id in (select id from brands where user_id = auth.uid())
  );

-- Employees: access via brand ownership
alter table employees enable row level security;
create policy "employees_own" on employees
  for all using (
    brand_id in (select id from brands where user_id = auth.uid())
  );

-- Agent tasks: access via brand ownership
alter table agent_tasks enable row level security;
create policy "agent_tasks_own" on agent_tasks
  for all using (
    brand_id in (select id from brands where user_id = auth.uid())
  );

-- Waitlist: public insert only
alter table waitlist enable row level security;
create policy "waitlist_insert" on waitlist
  for insert with check (true);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at on brands
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger brands_updated_at
  before update on brands
  for each row execute function update_updated_at();

create trigger brand_details_updated_at
  before update on brand_details
  for each row execute function update_updated_at();

-- Semantic search function for Brand Brain
-- Agents call this to retrieve relevant brand context
create or replace function search_brand_brain(
  p_brand_id   uuid,
  p_embedding  vector(768),
  p_limit      int default 5
)
returns table (content text, source text, similarity float)
language plpgsql as $$
begin
  return query
  select
    bc.content,
    bc.source,
    1 - (bc.embedding <=> p_embedding) as similarity
  from brand_chunks bc
  where bc.brand_id = p_brand_id
  order by bc.embedding <=> p_embedding
  limit p_limit;
end;
$$;

-- ============================================================
-- SEED: Default employee roster
-- These 10 employees are available to all brands
-- Status = 'inactive' until brand hires them
-- ============================================================
-- NOTE: Run this after creating your first brand,
-- replacing the brand_id with your actual brand UUID.
-- Or leave it — the app creates employees during onboarding.

-- Example (uncomment and replace UUID after onboarding):
/*
insert into employees (brand_id, name, role, team, phase) values
  ('YOUR-BRAND-UUID', 'Sana',  'sales',       'revenue',   1),
  ('YOUR-BRAND-UUID', 'Riya',  'retention',   'revenue',   2),
  ('YOUR-BRAND-UUID', 'Sid',   'support',     'revenue',   1),
  ('YOUR-BRAND-UUID', 'Cora',  'content',     'marketing', 1),
  ('YOUR-BRAND-UUID', 'Sona',  'social',      'marketing', 2),
  ('YOUR-BRAND-UUID', 'Cal',   'campaign',    'marketing', 2),
  ('YOUR-BRAND-UUID', 'Priya', 'partnership', 'growth',    3),
  ('YOUR-BRAND-UUID', 'Leo',   'lead',        'growth',    3),
  ('YOUR-BRAND-UUID', 'Anya',  'analytics',   'ops',       3),
  ('YOUR-BRAND-UUID', 'Finn',  'founder',     'ops',       1);
*/
