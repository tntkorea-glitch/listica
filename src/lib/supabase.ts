import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as ReturnType<typeof createClient>);

// 타입 정의
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
  created_at: string;
  contact_count?: number;
}

export interface ContactGroup {
  contact_id: string;
  group_id: string;
}

export interface SyncLog {
  id: string;
  user_id: string;
  action: 'create' | 'update' | 'delete';
  contact_id: string;
  device_id: string;
  synced_at: string;
}
