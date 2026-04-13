// ============================================
// 공유 타입 — 웹/모바일 공용
// ============================================

export interface Contact {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  phone2?: string;
  email?: string;
  email2?: string;
  company?: string;
  position?: string;
  address?: string;
  memo?: string;
  profile_image?: string;
  favorite: boolean;
  version: number;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
  groups?: Group[];
  contact_groups?: { group_id: string }[];
}

export interface Group {
  id: string;
  user_id: string;
  name: string;
  color: string;
  version: number;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
  contact_count?: number;
}

export interface ContactGroup {
  contact_id: string;
  group_id: string;
  created_at?: string;
  removed_at?: string | null;
}

export interface Device {
  id: string;
  user_id: string;
  device_name: string;
  device_type: 'web' | 'ios' | 'android';
  push_token?: string;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SyncEvent {
  id: string;
  user_id: string;
  device_id?: string;
  entity_type: 'contact' | 'group' | 'contact_group';
  entity_id?: string;
  action: 'create' | 'update' | 'delete';
  changes?: Record<string, unknown>;
  created_at: string;
}

// ============================================
// Sync Protocol 타입
// ============================================

export interface SyncPullRequest {
  device_id: string;
  since: string | null; // ISO timestamp, null = full sync
}

export interface SyncPullResponse {
  server_time: string;
  changes: {
    contacts: {
      upserted: Contact[];
      deleted: { id: string; deleted_at: string }[];
    };
    groups: {
      upserted: Group[];
      deleted: { id: string; deleted_at: string }[];
    };
    contact_groups: {
      added: ContactGroup[];
      removed: ContactGroup[];
    };
  };
}

export interface SyncPushChange {
  type: 'contact' | 'group' | 'contact_group';
  action: 'create' | 'update' | 'delete' | 'add' | 'remove';
  id?: string;
  client_id?: string;
  data?: Record<string, unknown>;
  base_version?: number;
}

export interface SyncPushRequest {
  device_id: string;
  changes: SyncPushChange[];
}

export interface SyncPushResult {
  client_id?: string;
  id?: string;
  server_id?: string;
  status: 'created' | 'updated' | 'deleted' | 'added' | 'removed' | 'conflict' | 'error';
  version?: number;
  server_data?: Record<string, unknown>;
  error?: string;
}

export interface SyncPushResponse {
  server_time: string;
  results: SyncPushResult[];
}

// ============================================
// API 공통 타입
// ============================================

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    total_pages?: number;
    version?: number;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}
