-- ============================================
-- 네이버주소록 클론 - v1 마이그레이션
-- Delta Sync + 멀티디바이스 + Supabase Auth
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- ============================================
-- 1. 기존 테이블 컬럼 추가
-- ============================================

-- contacts: version + soft delete
alter table contacts add column if not exists version integer not null default 1;
alter table contacts add column if not exists deleted_at timestamptz;

-- groups: version + soft delete + updated_at
alter table groups add column if not exists version integer not null default 1;
alter table groups add column if not exists deleted_at timestamptz;
alter table groups add column if not exists updated_at timestamptz default now();

-- contact_groups: 추적 컬럼
alter table contact_groups add column if not exists created_at timestamptz default now();
alter table contact_groups add column if not exists removed_at timestamptz;

-- ============================================
-- 2. 새 테이블: devices
-- ============================================
create table if not exists devices (
  id uuid default gen_random_uuid() primary key,
  user_id text not null default 'default',
  device_name text not null,
  device_type text not null check (device_type in ('web', 'ios', 'android')),
  push_token text,
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- 3. 새 테이블: sync_events (sync_log 대체)
-- ============================================
create table if not exists sync_events (
  id uuid default gen_random_uuid() primary key,
  user_id text not null default 'default',
  device_id uuid references devices(id) on delete set null,
  entity_type text not null check (entity_type in ('contact', 'group', 'contact_group')),
  entity_id text,
  action text not null check (action in ('create', 'update', 'delete')),
  changes jsonb,
  created_at timestamptz default now()
);

-- ============================================
-- 4. 인덱스
-- ============================================

-- Delta sync 쿼리용
create index if not exists idx_contacts_updated on contacts(user_id, updated_at);
create index if not exists idx_contacts_deleted on contacts(user_id, deleted_at) where deleted_at is not null;
create index if not exists idx_contacts_version on contacts(user_id, version);
create index if not exists idx_contacts_not_deleted on contacts(user_id) where deleted_at is null;

create index if not exists idx_groups_updated on groups(user_id, updated_at);
create index if not exists idx_groups_deleted on groups(user_id, deleted_at) where deleted_at is not null;

create index if not exists idx_contact_groups_sync on contact_groups(created_at) where removed_at is null;
create index if not exists idx_contact_groups_removed on contact_groups(removed_at) where removed_at is not null;

create index if not exists idx_devices_user on devices(user_id);
create index if not exists idx_sync_events_user_time on sync_events(user_id, created_at);
create index if not exists idx_sync_events_device on sync_events(device_id, created_at);

-- ============================================
-- 5. 트리거: version 자동 증가 + updated_at
-- ============================================

-- contacts 버전 증가 트리거
create or replace function increment_contact_version()
returns trigger as $$
begin
  -- soft delete 시에는 version 증가하지 않음
  if new.deleted_at is not null and old.deleted_at is null then
    new.updated_at = now();
    return new;
  end if;
  new.version = old.version + 1;
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists contacts_updated_at on contacts;
drop trigger if exists contacts_version_increment on contacts;
create trigger contacts_version_increment
  before update on contacts
  for each row execute function increment_contact_version();

-- groups 버전 증가 트리거
create or replace function increment_group_version()
returns trigger as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    new.updated_at = now();
    return new;
  end if;
  new.version = old.version + 1;
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists groups_version_increment on groups;
create trigger groups_version_increment
  before update on groups
  for each row execute function increment_group_version();

-- devices updated_at 트리거
create or replace function update_device_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists devices_updated_at on devices;
create trigger devices_updated_at
  before update on devices
  for each row execute function update_device_updated_at();

-- ============================================
-- 6. Realtime 활성화 (새 테이블)
-- ============================================
-- devices와 sync_events는 Realtime 불필요 (API polling)
-- 기존 contacts, groups, contact_groups는 이미 활성화됨

-- ============================================
-- 7. 기존 sync_log 테이블 삭제
-- ============================================
drop table if exists sync_log;

-- ============================================
-- 완료! 다음 단계: .env.local에 Supabase Auth 설정
-- ============================================
