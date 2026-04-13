import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { apiError, ErrorCodes } from '@/lib/errors';
import { NextResponse } from 'next/server';

// POST /api/v1/sync/pull — Delta Sync: 변경분 가져오기
export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const { device_id, since } = await request.json();
  const serverTime = new Date().toISOString();
  const userId = user!.id;

  // 디바이스 last_synced_at 업데이트
  if (device_id) {
    await supabase
      .from('devices')
      .update({ last_synced_at: serverTime })
      .eq('id', device_id)
      .eq('user_id', userId);
  }

  // ============================================
  // Full Sync (since === null)
  // ============================================
  if (!since) {
    const [contacts, groups, contactGroups] = await Promise.all([
      supabase
        .from('contacts')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false }),
      supabase
        .from('groups')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('name'),
      supabase
        .from('contact_groups')
        .select('*')
        .is('removed_at', null),
    ]);

    return NextResponse.json({
      server_time: serverTime,
      changes: {
        contacts: {
          upserted: contacts.data || [],
          deleted: [],
        },
        groups: {
          upserted: groups.data || [],
          deleted: [],
        },
        contact_groups: {
          added: contactGroups.data || [],
          removed: [],
        },
      },
    });
  }

  // ============================================
  // Delta Sync (since !== null)
  // ============================================
  const [
    upsertedContacts,
    deletedContacts,
    upsertedGroups,
    deletedGroups,
    addedCG,
    removedCG,
  ] = await Promise.all([
    // 변경된 연락처 (생성/수정)
    supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gt('updated_at', since)
      .order('updated_at', { ascending: false }),

    // 삭제된 연락처
    supabase
      .from('contacts')
      .select('id, deleted_at')
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)
      .gt('deleted_at', since),

    // 변경된 그룹
    supabase
      .from('groups')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gt('updated_at', since),

    // 삭제된 그룹
    supabase
      .from('groups')
      .select('id, deleted_at')
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)
      .gt('deleted_at', since),

    // 새로 추가된 그룹-연락처 연결
    supabase
      .from('contact_groups')
      .select('*')
      .is('removed_at', null)
      .gt('created_at', since),

    // 제거된 그룹-연락처 연결
    supabase
      .from('contact_groups')
      .select('contact_id, group_id, removed_at')
      .not('removed_at', 'is', null)
      .gt('removed_at', since),
  ]);

  if ([upsertedContacts, deletedContacts, upsertedGroups, deletedGroups, addedCG, removedCG]
    .some(r => r.error)) {
    return apiError(ErrorCodes.INTERNAL, 'Delta sync 쿼리 실패');
  }

  return NextResponse.json({
    server_time: serverTime,
    changes: {
      contacts: {
        upserted: upsertedContacts.data || [],
        deleted: (deletedContacts.data || []).map(c => ({ id: c.id, deleted_at: c.deleted_at })),
      },
      groups: {
        upserted: upsertedGroups.data || [],
        deleted: (deletedGroups.data || []).map(g => ({ id: g.id, deleted_at: g.deleted_at })),
      },
      contact_groups: {
        added: addedCG.data || [],
        removed: (removedCG.data || []).map(cg => ({
          contact_id: cg.contact_id,
          group_id: cg.group_id,
          removed_at: cg.removed_at,
        })),
      },
    },
  });
}
