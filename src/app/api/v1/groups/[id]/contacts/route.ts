import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { apiError, apiSuccess, ErrorCodes } from '@/lib/errors';

// GET /api/v1/groups/[id]/contacts — 그룹 내 연락처 목록
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth(request);
  if (error) return error;
  const { id } = await params;

  const { data: cg } = await supabase
    .from('contact_groups')
    .select('contact_id')
    .eq('group_id', id)
    .is('removed_at', null);

  if (!cg?.length) {
    return apiSuccess([]);
  }

  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .in('id', cg.map(c => c.contact_id))
    .eq('user_id', user!.id)
    .is('deleted_at', null)
    .order('last_name');

  return apiSuccess(contacts || []);
}

// POST /api/v1/groups/[id]/contacts — 그룹에 연락처 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth(request);
  if (error) return error;
  const { id } = await params;

  const { contact_ids } = await request.json();

  if (!contact_ids?.length) {
    return apiError(ErrorCodes.VALIDATION, 'contact_ids가 필요합니다');
  }

  // 이미 연결된 것 제외
  const { data: existing } = await supabase
    .from('contact_groups')
    .select('contact_id')
    .eq('group_id', id)
    .in('contact_id', contact_ids)
    .is('removed_at', null);

  const existingSet = new Set(existing?.map(e => e.contact_id) || []);
  const newLinks = contact_ids
    .filter((cid: string) => !existingSet.has(cid))
    .map((cid: string) => ({ contact_id: cid, group_id: id }));

  if (newLinks.length) {
    await supabase.from('contact_groups').insert(newLinks);

    // 동기화 이벤트
    await supabase.from('sync_events').insert(
      newLinks.map((l: { contact_id: string; group_id: string }) => ({
        user_id: user!.id,
        entity_type: 'contact_group' as const,
        entity_id: `${l.contact_id}:${l.group_id}`,
        action: 'create' as const,
      }))
    );
  }

  return apiSuccess({ added: newLinks.length });
}

// DELETE /api/v1/groups/[id]/contacts — 그룹에서 연락처 제거
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth(request);
  if (error) return error;
  const { id } = await params;

  const ids = request.nextUrl.searchParams.get('ids')?.split(',').filter(Boolean);

  if (!ids?.length) {
    return apiError(ErrorCodes.VALIDATION, 'ids 파라미터가 필요합니다');
  }

  const now = new Date().toISOString();

  await supabase
    .from('contact_groups')
    .update({ removed_at: now })
    .eq('group_id', id)
    .in('contact_id', ids)
    .is('removed_at', null);

  // 동기화 이벤트
  await supabase.from('sync_events').insert(
    ids.map(cid => ({
      user_id: user!.id,
      entity_type: 'contact_group' as const,
      entity_id: `${cid}:${id}`,
      action: 'delete' as const,
    }))
  );

  return apiSuccess({ removed: ids.length });
}
