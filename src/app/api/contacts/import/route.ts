import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/contacts/import - vCard 가져오기
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'file required' }, { status: 400 });
  }

  const text = await file.text();
  const contacts = parseVCard(text);

  if (contacts.length === 0) {
    return NextResponse.json({ error: 'no contacts found in file' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('contacts')
    .insert(contacts)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 동기화 로그
  if (data) {
    await supabase.from('sync_log').insert(
      data.map(c => ({
        action: 'create' as const,
        contact_id: c.id,
        device_id: 'import',
      }))
    );
  }

  return NextResponse.json({ imported: data?.length || 0, contacts: data });
}

function parseVCard(text: string) {
  const contacts: Record<string, string | boolean>[] = [];
  const vcards = text.split('BEGIN:VCARD');

  for (const vcard of vcards) {
    if (!vcard.includes('END:VCARD')) continue;

    const contact: Record<string, string | boolean> = {
      first_name: '',
      last_name: '',
      phone: '',
      favorite: false,
    };

    const lines = vcard.split(/\r?\n/);

    for (const line of lines) {
      // N:성;이름;;;
      if (line.startsWith('N:') || line.startsWith('N;')) {
        const parts = line.replace(/^N[;:].*?:/, '').split(';');
        if (line.startsWith('N:')) {
          const nParts = line.substring(2).split(';');
          contact.last_name = nParts[0] || '';
          contact.first_name = nParts[1] || '';
        } else {
          contact.last_name = parts[0] || '';
          contact.first_name = parts[1] || '';
        }
      }

      // FN (fallback if N is empty)
      if (line.startsWith('FN:') && !contact.last_name && !contact.first_name) {
        const fn = line.substring(3).trim();
        const parts = fn.split(' ');
        if (parts.length >= 2) {
          contact.last_name = parts[0];
          contact.first_name = parts.slice(1).join(' ');
        } else {
          contact.first_name = fn;
        }
      }

      // TEL
      if (line.startsWith('TEL')) {
        const phone = line.replace(/^TEL[^:]*:/, '').trim();
        if (!contact.phone) {
          contact.phone = phone;
        } else if (!contact.phone2) {
          contact.phone2 = phone;
        }
      }

      // EMAIL
      if (line.startsWith('EMAIL')) {
        const email = line.replace(/^EMAIL[^:]*:/, '').trim();
        if (!contact.email) {
          contact.email = email;
        } else if (!contact.email2) {
          contact.email2 = email;
        }
      }

      // ORG
      if (line.startsWith('ORG:')) {
        contact.company = line.substring(4).split(';')[0].trim();
      }

      // TITLE
      if (line.startsWith('TITLE:')) {
        contact.position = line.substring(6).trim();
      }

      // ADR
      if (line.startsWith('ADR')) {
        const parts = line.replace(/^ADR[^:]*:/, '').split(';');
        contact.address = parts.filter(Boolean).join(' ').trim();
      }

      // NOTE
      if (line.startsWith('NOTE:')) {
        contact.memo = line.substring(5).trim();
      }
    }

    // 최소한 이름이나 전화번호가 있어야 저장
    if (contact.first_name || contact.last_name || contact.phone) {
      contacts.push(contact);
    }
  }

  return contacts;
}
