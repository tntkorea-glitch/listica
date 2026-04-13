import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { apiError, apiSuccess, ErrorCodes } from '@/lib/errors';

// POST /api/v1/contacts/batch — 일괄 생성/수정/삭제
export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const { operations } = await request.json();

  if (!Array.isArray(operations) || operations.length === 0) {
    return apiError(ErrorCodes.VALIDATION, 'operations 배열이 필요합니다');
  }

  if (operations.length > 100) {
    return apiError(ErrorCodes.VALIDATION, '한 번에 최대 100개까지 처리 가능합니다');
  }

  const results: { action: string; id?: string; status: string; error?: string }[] = [];

  for (const op of operations) {
    try {
      switch (op.action) {
        case 'create': {
          const { data } = await supabase
            .from('contacts')
            .insert({ ...op.data, user_id: user!.id })
            .select('id')
            .single();
          results.push({ action: 'create', id: data?.id, status: 'created' });
          break;
        }
        case 'update': {
          const { data } = await supabase
            .from('contacts')
            .update(op.data)
            .eq('id', op.id)
            .eq('user_id', user!.id)
            .select('id')
            .single();
          results.push({ action: 'update', id: data?.id || op.id, status: data ? 'updated' : 'not_found' });
          break;
        }
        case 'delete': {
          await supabase
            .from('contacts')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', op.id)
            .eq('user_id', user!.id);
          results.push({ action: 'delete', id: op.id, status: 'deleted' });
          break;
        }
        default:
          results.push({ action: op.action, status: 'error', error: 'unknown action' });
      }
    } catch (e) {
      results.push({ action: op.action, id: op.id, status: 'error', error: (e as Error).message });
    }
  }

  // 일괄 동기화 이벤트
  const events = results
    .filter(r => r.status !== 'error')
    .map(r => ({
      user_id: user!.id,
      entity_type: 'contact' as const,
      entity_id: r.id,
      action: r.action as 'create' | 'update' | 'delete',
    }));

  if (events.length) {
    await supabase.from('sync_events').insert(events);
  }

  return apiSuccess({ results });
}
