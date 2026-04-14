import { NextRequest } from 'next/server';
import { supabase, fetchAllRows } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { apiError, apiSuccess, ErrorCodes } from '@/lib/errors';

// GET /api/v1/groups — 그룹 목록 (연락처 수 포함)
export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const { data: groups, error: dbError } = await supabase
    .from('groups')
    .select('*')
    .eq('user_id', user!.id)
    .is('deleted_at', null)
    .order('name');

  if (dbError) {
    return apiError(ErrorCodes.INTERNAL, dbError.message);
  }

  // 그룹별 연락처 수 — RPC 함수로 DB 집계 (빠름)
  const { data: countsData, error: countsErr } = await supabase
    .rpc('group_contact_counts', { uid: user!.id });

  const countMap: Record<string, number> = {};
  if (!countsErr && countsData) {
    for (const row of countsData as { group_id: string; cnt: number | string }[]) {
      countMap[row.group_id] = Number(row.cnt);
    }
  } else {
    // RPC 실패 시 fallback: 기존 페이지네이션
    const counts = await fetchAllRows<{ group_id: string }>(() =>
      supabase.from('contact_groups').select('group_id').is('removed_at', null)
    );
    counts.forEach(c => {
      countMap[c.group_id] = (countMap[c.group_id] || 0) + 1;
    });
  }

  const result = (groups || []).map(g => ({
    ...g,
    contact_count: countMap[g.id] || 0,
  }));

  return apiSuccess(result);
}

// POST /api/v1/groups — 그룹 생성
export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const body = await request.json();

  if (!body.name?.trim()) {
    return apiError(ErrorCodes.VALIDATION, '그룹 이름이 필요합니다');
  }

  const { data, error: dbError } = await supabase
    .from('groups')
    .insert({
      name: body.name.trim(),
      color: body.color || '#6366f1',
      user_id: user!.id,
    })
    .select()
    .single();

  if (dbError) {
    return apiError(ErrorCodes.INTERNAL, dbError.message);
  }

  await supabase.from('sync_events').insert({
    user_id: user!.id,
    entity_type: 'group',
    entity_id: data.id,
    action: 'create',
  });

  return apiSuccess(data, 201);
}
