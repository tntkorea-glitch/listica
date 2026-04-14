import Dexie, { type Table } from 'dexie';
import type { Contact, Group } from './types';

// 로컬 연락처 레코드 — 서버 Contact + 로컬 메타
export type LocalContact = Contact;

export type LocalGroup = Group;

export interface LocalContactGroup {
  contact_id: string;
  group_id: string;
  removed_at?: string | null;
}

// sync 상태 메타 (user별 마지막 동기화 시각)
export interface SyncMeta {
  key: string; // `${userId}`
  user_id: string;
  last_pulled_at: string | null; // ISO
  total_contacts: number;
  updated_at: string;
}

export class NaverContactDB extends Dexie {
  contacts!: Table<LocalContact, string>;
  groups!: Table<LocalGroup, string>;
  contact_groups!: Table<LocalContactGroup, [string, string]>;
  sync_meta!: Table<SyncMeta, string>;

  constructor() {
    super('naver-contact');
    this.version(1).stores({
      contacts: 'id, user_id, last_name, first_name, phone, email, favorite, updated_at, deleted_at',
      groups: 'id, user_id, name, updated_at, deleted_at',
      contact_groups: '[contact_id+group_id], contact_id, group_id',
      sync_meta: 'key, user_id',
    });
  }
}

export const db = new NaverContactDB();

export async function clearLocalData() {
  await Promise.all([
    db.contacts.clear(),
    db.groups.clear(),
    db.contact_groups.clear(),
    db.sync_meta.clear(),
  ]);
}
