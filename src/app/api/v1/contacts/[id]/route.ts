import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { apiError, apiSuccess, ErrorCodes } from '@/lib/errors';

// GET /api/v1/contacts/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth(request);
  if (error) return error;
  const { id } = await params;

  const { data, error: dbError } = await supabase
    .from('contacts')
    .select('*, contact_groups(group_id, groups(*))')
    .eq('id', id)
    .eq('user_id', user!.id)
    .is('deleted_at', null)
    .single();

  if (dbError || !data) {
    return apiError(ErrorCodes.NOT_FOUND, '연락처를 찾을 수 없습니다');
  }

  return apiSuccess(data);
}

// PUT /api/v1/contacts/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth(request);
  if (error) return error;
  const { id } = await params;

  const body = await request.json();
  const { groups: groupIds, contact_groups: _cg, base_version, ...contactData } = body;

  // 버전 충돌 감지
  if (base_version !== undefined) {
    const { data: current } = await supabase
      .from('contacts')
      .select('version')
      .eq('id', id)
      .eq('user_id', user!.id)
      .single();

    if (current && current.version !== base_version) {
      return apiError(ErrorCodes.CONFLICT, '다른 기기에서 수정되었습니다', {
        server_version: current.version,
        client_version: base_version,
      });
    }
  }

  const { data, error: dbError } = await supabase
    .from('contacts')
    .update(contactData)
    .eq('id', id)
    .eq('user_id', user!.id)
    .is('deleted_at', null)
    .select()
    .single();

  if (dbError || !data) {
    return apiError(ErrorCodes.NOT_FOUND, '연락처를 찾을 수 없습니다');
  }

  // 그룹 재설정 (soft delete 방식)
  if (groupIds !== undefined) {
    // 기존 연결 soft delete
    await supabase
      .from('contact_groups')
      .update({ removed_at: new Date().toISOString() })
      .eq('contact_id', id)
      .is('removed_at', null);

    // 새 연결 추가
    if (groupIds.length > 0) {
      await supabase.from('contact_groups').insert(
        groupIds.map((gid: string) => ({ contact_id: id, group_id: gid }))
      );
    }
  }

  // 동기화 이벤트
  await supabase.from('sync_events').insert({
    user_id: user!.id,
    entity_type: 'contact',
    entity_id: id,
    action: 'update',
    changes: contactData,
  });

  return apiSuccess(data);
}

// DELETE /api/v1/contacts/[id] — Soft Delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth(request);
  if (error) return error;
  const { id } = await params;

  const { data, error: dbError } = await supabase
    .from('contacts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user!.id)
    .is('deleted_at', null)
    .select('id')
    .single();

  if (dbError || !data) {
    return apiError(ErrorCodes.NOT_FOUND, '연락처를 찾을 수 없습니다');
  }

  // 그룹 연결도 soft delete
  await supabase
    .from('contact_groups')
    .update({ removed_at: new Date().toISOString() })
    .eq('contact_id', id)
    .is('removed_at', null);

  // 동기화 이벤트
  await supabase.from('sync_events').insert({
    user_id: user!.id,
    entity_type: 'contact',
    entity_id: id,
    action: 'delete',
  });

  return apiSuccess({ success: true });
}
