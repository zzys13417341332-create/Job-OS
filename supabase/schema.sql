-- ============================================================
-- Job OS - Supabase 数据库迁移脚本（单用户个人系统）
-- 执行位置：Supabase Dashboard → SQL Editor → New query
-- 说明：为保持与前端数据模型一一对应，每张表保存 data JSONB；
--       需要按字段检索时，后续可把高频字段提升为独立列。
-- ============================================================

-- 1) 各实体表（id 使用前端生成的字符串 id，user_id 绑定 Supabase 账号）
create table if not exists public.resume_profiles (
  id text primary key,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.interviews (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.todos (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.self_introductions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  id text primary key,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) 行级安全：个人数据只允许本人读写
alter table public.resume_profiles enable row level security;
alter table public.projects enable row level security;
alter table public.jobs enable row level security;
alter table public.interviews enable row level security;
alter table public.knowledge enable row level security;
alter table public.todos enable row level security;
alter table public.self_introductions enable row level security;
alter table public.settings enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'resume_profiles','projects','jobs','interviews',
    'knowledge','todos','self_introductions','settings'
  ]
  loop
    execute format(
      'create policy "own_%s" on public.%I using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t, t
    );
  end loop;
end $$;

-- 3) 面试录音存储桶（私有，路径 <user_id>/<interview_id>）
insert into storage.buckets (id, name, public)
values ('interview-audio', 'interview-audio', false)
on conflict (id) do nothing;

create policy "own_audio_read"
on storage.objects for select
using (bucket_id = 'interview-audio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own_audio_write"
on storage.objects for insert
with check (bucket_id = 'interview-audio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own_audio_delete"
on storage.objects for delete
using (bucket_id = 'interview-audio' and (storage.foldername(name))[1] = auth.uid()::text);
