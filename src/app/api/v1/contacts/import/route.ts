import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { apiError, apiSuccess, ErrorCodes } from '@/lib/errors';

// POST /api/v1/contacts/import — vCard 가져오기
export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return apiError(ErrorCodes.VALIDATION, 'file이 필요합니다');
  }

  const text = await file.text();
  const contacts = parseVCard(text, user!.id);

  if (contacts.length === 0) {
    return apiError(ErrorCodes.VALIDATION, '파일에서 연락처를 찾을 수 없습니다');
  }

  const { data, error: dbError } = await supabase
    .from('contacts')
    .insert(contacts)
    .select();

  if (dbError) {
    return apiError(ErrorCodes.INTERNAL, dbError.message);
  }

  // 동기화 이벤트
  if (data?.length) {
    await supabase.from('sync_events').insert(
      data.map(c => ({
        user_id: user!.id,
        entity_type: 'contact' as const,
        entity_id: c.id,
        action: 'create' as const,
      }))
    );
  }

  return apiSuccess({ imported: data?.length || 0, contacts: data });
}

function parseVCard(text: string, userId: string) {
  const contacts: Record<string, unknown>[] = [];
  const vcards = text.split('BEGIN:VCARD');

  for (const vcard of vcards) {
    if (!vcard.includes('END:VCARD')) continue;

    const contact: Record<string, unknown> = {
      user_id: userId,
      first_name: '',
      last_name: '',
      phone: '',
      favorite: false,
    };

    const lines = vcard.split(/\r?\n/);

    for (const line of lines) {
      if (line.startsWith('N:')) {
        const parts = line.substring(2).split(';');
        contact.last_name = parts[0] || '';
        contact.first_name = parts[1] || '';
      } else if (line.startsWith('N;')) {
        const value = line.replace(/^N[;:].*?:/, '');
        const parts = value.split(';');
        contact.last_name = parts[0] || '';
        contact.first_name = parts[1] || '';
      } else if (line.startsWith('FN:') && !contact.last_name && !contact.first_name) {
        const fn = line.substring(3).trim();
        const parts = fn.split(' ');
        if (parts.length >= 2) {
          contact.last_name = parts[0];
          contact.first_name = parts.slice(1).join(' ');
        } else {
          contact.first_name = fn;
        }
      } else if (line.startsWith('TEL')) {
        const phone = line.replace(/^TEL[^:]*:/, '').trim();
        if (!contact.phone) contact.phone = phone;
        else if (!contact.phone2) contact.phone2 = phone;
      } else if (line.startsWith('EMAIL')) {
        const email = line.replace(/^EMAIL[^:]*:/, '').trim();
        if (!contact.email) contact.email = email;
        else if (!contact.email2) contact.email2 = email;
      } else if (line.startsWith('ORG:')) {
        contact.company = line.substring(4).split(';')[0].trim();
      } else if (line.startsWith('TITLE:')) {
        contact.position = line.substring(6).trim();
      } else if (line.startsWith('ADR')) {
        const parts = line.replace(/^ADR[^:]*:/, '').split(';');
        contact.address = parts.filter(Boolean).join(' ').trim();
      } else if (line.startsWith('NOTE:')) {
        contact.memo = line.substring(5).trim();
      }
    }

    if (contact.first_name || contact.last_name || contact.phone) {
      contacts.push(contact);
    }
  }

  return contacts;
}
