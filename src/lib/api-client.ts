import type {
  Contact, Group, Device,
  SyncPullRequest, SyncPullResponse,
  SyncPushRequest, SyncPushResponse,
  PaginatedResponse, ApiResponse,
} from './types';

// ============================================
// API 클라이언트 — 웹/모바일 공용
// ============================================

let _baseUrl = '';
let _getToken: (() => Promise<string | null>) | null = null;

export function configureApiClient(opts: {
  baseUrl: string;
  getToken: () => Promise<string | null>;
}) {
  _baseUrl = opts.baseUrl;
  _getToken = opts.getToken;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = _getToken ? await _getToken() : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${_baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err.error?.message || `API Error ${res.status}`);
  }

  return res.json();
}

// ============================================
// Contacts API
// ============================================

export const contactsApi = {
  list(params?: {
    page?: number; limit?: number; search?: string;
    groupId?: string; favorite?: boolean; sort?: string; direction?: string;
  }) {
    const sp = new URLSearchParams();
    if (params?.page) sp.set('page', String(params.page));
    if (params?.limit) sp.set('limit', String(params.limit));
    if (params?.search) sp.set('search', params.search);
    if (params?.groupId) sp.set('group_id', params.groupId);
    if (params?.favorite) sp.set('favorite', 'true');
    if (params?.sort) sp.set('sort', params.sort);
    if (params?.direction) sp.set('direction', params.direction);
    return request<PaginatedResponse<Contact>>('GET', `/api/v1/contacts?${sp}`);
  },

  get(id: string) {
    return request<ApiResponse<Contact>>('GET', `/api/v1/contacts/${id}`);
  },

  create(data: Partial<Contact> & { groups?: string[] }) {
    return request<ApiResponse<Contact>>('POST', '/api/v1/contacts', data);
  },

  update(id: string, data: Partial<Contact> & { groups?: string[] }) {
    return request<ApiResponse<Contact>>('PUT', `/api/v1/contacts/${id}`, data);
  },

  delete(id: string) {
    return request<{ data: { success: true } }>('DELETE', `/api/v1/contacts/${id}`);
  },

  batch(operations: { action: 'create' | 'update' | 'delete'; id?: string; data?: Partial<Contact> }[]) {
    return request<{ data: { results: unknown[] } }>('POST', '/api/v1/contacts/batch', { operations });
  },

  duplicates() {
    return request<{ data: Contact[][] }>('GET', '/api/v1/contacts/duplicates');
  },

  merge(primaryId: string, mergeIds: string[]) {
    return request<ApiResponse<Contact>>('POST', '/api/v1/contacts/merge', { primary_id: primaryId, merge_ids: mergeIds });
  },

  exportVCard(ids?: string[]) {
    const sp = ids?.length ? `?ids=${ids.join(',')}` : '';
    return request<string>('GET', `/api/v1/contacts/export${sp}`);
  },
};

// ============================================
// Groups API
// ============================================

export const groupsApi = {
  list() {
    return request<{ data: Group[] }>('GET', '/api/v1/groups');
  },

  get(id: string) {
    return request<ApiResponse<Group>>('GET', `/api/v1/groups/${id}`);
  },

  create(data: { name: string; color?: string }) {
    return request<ApiResponse<Group>>('POST', '/api/v1/groups', data);
  },

  update(id: string, data: { name?: string; color?: string }) {
    return request<ApiResponse<Group>>('PUT', `/api/v1/groups/${id}`, data);
  },

  delete(id: string) {
    return request<{ data: { success: true } }>('DELETE', `/api/v1/groups/${id}`);
  },

  contacts(groupId: string) {
    return request<{ data: Contact[] }>('GET', `/api/v1/groups/${groupId}/contacts`);
  },

  addContacts(groupId: string, contactIds: string[]) {
    return request<{ data: { added: number } }>('POST', `/api/v1/groups/${groupId}/contacts`, { contact_ids: contactIds });
  },

  removeContacts(groupId: string, contactIds: string[]) {
    return request<{ data: { removed: number } }>('DELETE', `/api/v1/groups/${groupId}/contacts?ids=${contactIds.join(',')}`);
  },
};

// ============================================
// Sync API
// ============================================

export const syncApi = {
  pull(data: SyncPullRequest) {
    return request<SyncPullResponse>('POST', '/api/v1/sync/pull', data);
  },

  push(data: SyncPushRequest) {
    return request<SyncPushResponse>('POST', '/api/v1/sync/push', data);
  },

  status(deviceId: string) {
    return request<{ data: { device: Device; pending_changes: number } }>('GET', `/api/v1/sync/status?device_id=${deviceId}`);
  },
};

// ============================================
// Device / Auth API
// ============================================

export const deviceApi = {
  register(data: { device_name: string; device_type: 'web' | 'ios' | 'android'; push_token?: string }) {
    return request<ApiResponse<Device>>('POST', '/api/v1/auth/register', data);
  },

  list() {
    return request<{ data: Device[] }>('GET', '/api/v1/auth/devices');
  },

  remove(id: string) {
    return request<{ data: { success: true } }>('DELETE', `/api/v1/auth/devices/${id}`);
  },
};
