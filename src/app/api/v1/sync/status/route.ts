import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { apiError, apiSuccess, ErrorCodes } from '@/lib/errors';

// GET /api/v1/sync/status — 동기화 상태 확인
export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const deviceId = request.nextUrl.searchParams.get('device_id');

  if (!deviceId) {
    return apiError(ErrorCodes.VALIDATION, 'device_id가 필요합니다');
  }

  // 디바이스 정보
  const { data: device } = await supabase
    .from('devices')
    .select('*')
    .eq('id', deviceId)
    .eq('user_id', user!.id)
    .single();

  if (!device) {
    return apiError(ErrorCodes.NOT_FOUND, '디바이스를 찾을 수 없습니다');
  }

  // 마지막 동기화 이후 변경 수 계산
  let pendingChanges = 0;

  if (device.last_synced_at) {
    const { count: contactChanges } = await supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user!.id)
      .gt('updated_at', device.last_synced_at);

    const { count: groupChanges } = await supabase
      .from('groups')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user!.id)
      .gt('updated_at', device.last_synced_at);

    pendingChanges = (contactChanges || 0) + (groupChanges || 0);
  } else {
    // 한 번도 동기화하지 않은 디바이스 — 전체 데이터가 pending
    const { count } = await supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user!.id)
      .is('deleted_at', null);

    pendingChanges = count || 0;
  }

  return apiSuccess({
    device,
    pending_changes: pendingChanges,
  });
}
