import { NextRequest, NextResponse } from 'next/server';
import { supabase, fetchAllRows } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { apiError, ErrorCodes } from '@/lib/errors';
import * as XLSX from 'xlsx';

// GET /api/v1/contacts/export — 연락처 내보내기
// ?format=vcard|csv|xlsx  &ids=a,b,c  &group_id=xxx  &fields=name,phone,...
export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const sp = request.nextUrl.searchParams;
  const format = sp.get('format') || 'vcard';
  const ids = sp.get('ids')?.split(',').filter(Boolean);
  const groupId = sp.get('group_id');
  const fields = sp.get('fields')?.split(',') || ['name', 'phone', 'email', 'company'];

  // groupId 필터: contact_groups에서 contact_id 목록을 먼저 가져옴 (페이지네이션)
  let groupContactIds: string[] | null = null;
  if (groupId) {
    try {
      const cg = await fetchAllRows<{ contact_id: string }>(() =>
        supabase
          .from('contact_groups')
          .select('contact_id')
          .eq('group_id', groupId)
          .is('removed_at', null)
      );
      groupContactIds = cg.map(c => c.contact_id);
      if (groupContactIds.length === 0) {
        groupContactIds = ['__none__'];
      }
    } catch (e) {
      return apiError(ErrorCodes.INTERNAL, e instanceof Error ? e.message : String(e));
    }
  }

  let list: Record<string, unknown>[];
  try {
    list = await fetchAllRows<Record<string, unknown>>(() => {
      let q = supabase
        .from('contacts')
        .select('*, contact_groups(group_id, groups:group_id(name))')
        .eq('user_id', user!.id)
        .is('deleted_at', null);
      if (ids?.length) q = q.in('id', ids);
      if (groupContactIds) q = q.in('id', groupContactIds);
      return q;
    });
  } catch (e) {
    return apiError(ErrorCodes.INTERNAL, e instanceof Error ? e.message : String(e));
  }

  if (format === 'csv' || format === 'xlsx') {
    return exportSpreadsheet(list, format, fields);
  }

  return exportVCard(list);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exportSpreadsheet(contacts: any[], format: 'csv' | 'xlsx', fields: string[]) {
  const headers: string[] = [];
  const fieldMap: { key: string; header: string; getter: (c: Record<string, unknown>) => string }[] = [];

  const allFields = [
    { key: 'name', header: '이름', getter: (c: Record<string, unknown>) => [c.last_name, c.first_name].filter(Boolean).join(' ') },
    { key: 'phone', header: '전화번호', getter: (c: Record<string, unknown>) => (c.phone as string) || '' },
    { key: 'email', header: '이메일', getter: (c: Record<string, unknown>) => (c.email as string) || '' },
    { key: 'group', header: '그룹명', getter: (c: Record<string, unknown>) => {
      const cg = c.contact_groups as { groups?: { name?: string } }[] | undefined;
      return cg?.map(g => g.groups?.name).filter(Boolean).join(', ') || '';
    }},
    { key: 'company', header: '회사·소속', getter: (c: Record<string, unknown>) => (c.company as string) || '' },
    { key: 'position', header: '직책', getter: (c: Record<string, unknown>) => (c.position as string) || '' },
    { key: 'address', header: '주소', getter: (c: Record<string, unknown>) => (c.address as string) || '' },
    { key: 'memo', header: '메모', getter: (c: Record<string, unknown>) => (c.memo as string) || '' },
  ];

  for (const f of allFields) {
    if (fields.includes(f.key)) {
      headers.push(f.header);
      fieldMap.push(f);
    }
  }

  const rows = contacts.map(c => fieldMap.map(f => f.getter(c)));
  const data = [headers, ...rows];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Contacts');

  const dateStr = new Date().toISOString().slice(0, 10);

  if (format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(ws);
    // BOM + UTF-8 for Excel compatibility
    const bom = '\uFEFF';
    return new NextResponse(bom + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="contacts-${dateStr}.csv"`,
      },
    });
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="contacts-${dateStr}.xlsx"`,
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exportVCard(contacts: any[]) {
  const vcards = contacts.map(c => {
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
    // 그룹 — CATEGORIES 필드 (iOS/macOS: 그룹으로 인식, Android: 기종별로 라벨 변환)
    const groupNames = (c.contact_groups as { groups?: { name?: string } }[] | undefined)
      ?.map(g => g.groups?.name)
      .filter(Boolean) as string[] | undefined;
    if (groupNames && groupNames.length > 0) {
      // vCard CATEGORIES는 쉼표 구분. 쉼표/세미콜론은 백슬래시 이스케이프
      const escaped = groupNames.map(n => n.replace(/([,;\\])/g, '\\$1'));
      lines.push(`CATEGORIES:${escaped.join(',')}`);
      // Apple 특화 X-ADDRESSBOOKSERVER-KIND (일부 iOS 버전에서 그룹 인식 강화)
      // - 없어도 CATEGORIES로 충분. 생략.
    }
    lines.push('END:VCARD');
    return lines.join('\r\n');
  });

  return new NextResponse(vcards.join('\r\n'), {
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="contacts-${new Date().toISOString().slice(0, 10)}.vcf"`,
    },
  });
}
