import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { apiError, apiSuccess, ErrorCodes } from '@/lib/errors';

// GET /api/v1/groups/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth(request);
  if (error) return error;
  const { id } = await params;

  const { data, error: dbError } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .eq('user_id', user!.id)
    .is('deleted_at', null)
    .single();

  if (dbError || !data) {
    return apiError(ErrorCodes.NOT_FOUND, '그룹을 찾을 수 없습니다');
  }

  return apiSuccess(data);
}

// PUT /api/v1/groups/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth(request);
  if (error) return error;
  const { id } = await params;

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.color !== undefined) updates.color = body.color;

  const { data, error: dbError } = await supabase
    .from('groups')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user!.id)
    .is('deleted_at', null)
    .select()
    .single();

  if (dbError || !data) {
    return apiError(ErrorCodes.NOT_FOUND, '그룹을 찾을 수 없습니다');
  }

  await supabase.from('sync_events').insert({
    user_id: user!.id,
    entity_type: 'group',
    entity_id: id,
    action: 'update',
    changes: updates,
  });

  return apiSuccess(data);
}

// DELETE /api/v1/groups/[id] — Soft Delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth(request);
  if (error) return error;
  const { id } = await params;

  const now = new Date().toISOString();

  const { data, error: dbError } = await supabase
    .from('groups')
    .update({ deleted_at: now })
    .eq('id', id)
    .eq('user_id', user!.id)
    .is('deleted_at', null)
    .select('id')
    .single();

  if (dbError || !data) {
    return apiError(ErrorCodes.NOT_FOUND, '그룹을 찾을 수 없습니다');
  }

  // 그룹 내 연결도 soft delete
  await supabase
    .from('contact_groups')
    .update({ removed_at: now })
    .eq('group_id', id)
    .is('removed_at', null);

  await supabase.from('sync_events').insert({
    user_id: user!.id,
    entity_type: 'group',
    entity_id: id,
    action: 'delete',
  });

  return apiSuccess({ success: true });
}
