import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { apiError, ErrorCodes } from '@/lib/errors';

// GET /api/v1/contacts/export — vCard 내보내기
export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const ids = request.nextUrl.searchParams.get('ids')?.split(',').filter(Boolean);

  let query = supabase
    .from('contacts')
    .select('*')
    .eq('user_id', user!.id)
    .is('deleted_at', null);

  if (ids?.length) {
    query = query.in('id', ids);
  }

  const { data: contacts, error: dbError } = await query;

  if (dbError) {
    return apiError(ErrorCodes.INTERNAL, dbError.message);
  }

  const vcards = (contacts || []).map(c => {
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${c.last_name || ''};${c.first_name || ''};;;`,
      `FN:${[c.last_name, c.first_name].filter(Boolean).join(' ') || 'Unknown'}`,
    ];
    if (c.phone) lines.push(`TEL;TYPE=CELL:${c.phone}`);
    if (c.phone2) lines.push(`TEL;TYPE=HOME:${c.phone2}`);
    if (c.email) lines.push(`EMAIL;TYPE=INTERNET:${c.email}`);
    if (c.email2) lines.push(`EMAIL;TYPE=INTERNET:${c.email2}`);
    if (c.company) lines.push(`ORG:${c.company}`);
    if (c.position) lines.push(`TITLE:${c.position}`);
    if (c.address) lines.push(`ADR;TYPE=HOME:;;${c.address};;;;`);
    if (c.memo) lines.push(`NOTE:${c.memo}`);
    lines.push('END:VCARD');
    return lines.join('\r\n');
  });

  const body = vcards.join('\r\n');

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="contacts-${new Date().toISOString().slice(0, 10)}.vcf"`,
    },
  });
}
