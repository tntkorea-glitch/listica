import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { apiError, apiSuccess, ErrorCodes } from '@/lib/errors';

// GET /api/v1/auth/devices — 등록된 디바이스 목록
export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const { data, error: dbError } = await supabase
    .from('devices')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });

  if (dbError) {
    return apiError(ErrorCodes.INTERNAL, dbError.message);
  }

  return apiSuccess(data || []);
}
