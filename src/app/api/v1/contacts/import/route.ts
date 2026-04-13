import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { apiError, apiSuccess, ErrorCodes } from '@/lib/errors';
import * as XLSX from 'xlsx';

// POST /api/v1/contacts/import — 네이버 주소록 xlsx 또는 vCard 가져오기
export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return apiError(ErrorCodes.VALIDATION, 'file이 필요합니다');
  }

  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return handleXlsxImport(file, user!.id);
  } else if (fileName.endsWith('.vcf')) {
    const text = await file.text();
    return handleVCardImport(text, user!.id);
  } else {
    return apiError(ErrorCodes.VALIDATION, '지원하지 않는 파일 형식입니다. xlsx 또는 vcf 파일을 사용하세요.');
  }
}

// ─── 네이버 주소록 xlsx 처리 ───
async function handleXlsxImport(file: File, userId: string) {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

  if (rows.length < 2) {
    return apiError(ErrorCodes.VALIDATION, '파일에 데이터가 없습니다');
  }

  const header = rows[0] as string[];
  const col = (name: string) => header.indexOf(name);

  // 네이버 주소록 컬럼 인덱스
  const iLast = col('성');
  const iFirst = col('이름');
  const iPhone = col('휴대폰번호');
  const iEmail = col('이메일');
  const iGroup = col('그룹명');
  const iCompany = col('회사·소속명');
  const iPosition = col('직책');
  const iMemo = col('메모');
  const iHomeAddr = col('집주소');
  const iCompanyAddr = col('회사주소');
  const iPhone2 = col('추가휴대폰번호1');
  const iEmail2 = col('추가이메일1');
  const iExtraGroup1 = col('추가그룹명1');
  const iExtraGroup2 = col('추가그룹명2');
  const iExtraGroup3 = col('추가그룹명3');

  // 1단계: 그룹명 수집
  const groupNames = new Set<string>();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const g = str(r, iGroup);
    if (g) groupNames.add(g);
    if (iExtraGroup1 >= 0 && str(r, iExtraGroup1)) groupNames.add(str(r, iExtraGroup1));
    if (iExtraGroup2 >= 0 && str(r, iExtraGroup2)) groupNames.add(str(r, iExtraGroup2));
    if (iExtraGroup3 >= 0 && str(r, iExtraGroup3)) groupNames.add(str(r, iExtraGroup3));
  }

  // 2단계: 그룹 생성 (기존 그룹과 중복 방지)
  const { data: existingGroups } = await supabase
    .from('groups')
    .select('id, name')
    .eq('user_id', userId);

  const groupMap = new Map<string, string>();
  for (const g of existingGroups || []) {
    groupMap.set(g.name, g.id);
  }

  const newGroupNames = [...groupNames].filter(n => !groupMap.has(n));
  if (newGroupNames.length > 0) {
    // 배치로 그룹 생성 (50개씩)
    for (let i = 0; i < newGroupNames.length; i += 50) {
      const batch = newGroupNames.slice(i, i + 50).map(name => ({
        user_id: userId,
        name,
        color: generateColor(name),
      }));
      const { data } = await supabase.from('groups').insert(batch).select('id, name');
      if (data) {
        for (const g of data) groupMap.set(g.name, g.id);
      }
    }
  }

  // 3단계: 연락처 삽입 (500개씩 배치)
  let importedCount = 0;
  const contactGroupLinks: { contact_id: string; group_id: string }[] = [];

  for (let i = 1; i < rows.length; i += 500) {
    const batchRows = rows.slice(i, i + 500);
    const contacts = batchRows.map(r => {
      const lastName = str(r, iLast);
      const firstName = str(r, iFirst);

      return {
        user_id: userId,
        last_name: lastName,
        first_name: firstName,
        phone: str(r, iPhone),
        phone2: str(r, iPhone2),
        email: str(r, iEmail),
        email2: str(r, iEmail2),
        company: str(r, iCompany),
        position: str(r, iPosition),
        address: str(r, iHomeAddr) || str(r, iCompanyAddr),
        memo: str(r, iMemo),
        favorite: false,
      };
    }).filter(c => c.first_name || c.last_name || c.phone);

    const { data, error: dbError } = await supabase
      .from('contacts')
      .insert(contacts)
      .select('id');

    if (dbError) {
      return apiError(ErrorCodes.INTERNAL, `배치 ${Math.floor(i / 500) + 1} 실패: ${dbError.message}`);
    }

    if (data) {
      importedCount += data.length;

      // 그룹 연결 매핑
      for (let j = 0; j < data.length; j++) {
        const r = batchRows[j];
        const groups: string[] = [];
        const g = str(r, iGroup);
        if (g && groupMap.has(g)) groups.push(groupMap.get(g)!);
        if (iExtraGroup1 >= 0) {
          const eg1 = str(r, iExtraGroup1);
          if (eg1 && groupMap.has(eg1)) groups.push(groupMap.get(eg1)!);
        }
        if (iExtraGroup2 >= 0) {
          const eg2 = str(r, iExtraGroup2);
          if (eg2 && groupMap.has(eg2)) groups.push(groupMap.get(eg2)!);
        }
        if (iExtraGroup3 >= 0) {
          const eg3 = str(r, iExtraGroup3);
          if (eg3 && groupMap.has(eg3)) groups.push(groupMap.get(eg3)!);
        }

        for (const gid of groups) {
          contactGroupLinks.push({ contact_id: data[j].id, group_id: gid });
        }
      }
    }
  }

  // 4단계: contact_groups 연결 (1000개씩 배치)
  for (let i = 0; i < contactGroupLinks.length; i += 1000) {
    await supabase.from('contact_groups').insert(contactGroupLinks.slice(i, i + 1000));
  }

  return apiSuccess({
    imported: importedCount,
    groups_created: newGroupNames.length,
    groups_total: groupMap.size,
  });
}

// ─── vCard 처리 (기존) ───
async function handleVCardImport(text: string, userId: string) {
  const contacts = parseVCard(text, userId);

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

  return apiSuccess({ imported: data?.length || 0 });
}

// ─── 유틸 ───
function str(row: unknown[], idx: number): string {
  if (idx < 0 || idx >= row.length) return '';
  return (row[idx] ?? '').toString().trim();
}

function generateColor(name: string): string {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function parseVCard(text: string, userId: string) {
  const contacts: Record<string, unknown>[] = [];
  const vcards = text.split('BEGIN:VCARD');

  for (const vcard of vcards) {
    if (!vcard.includes('END:VCARD')) continue;

    const contact: Record<string, unknown> = {
      user_id: userId, first_name: '', last_name: '', phone: '', favorite: false,
    };

    const lines = vcard.split(/\r?\n/);
    for (const line of lines) {
      if (line.startsWith('N:')) {
        const parts = line.substring(2).split(';');
        contact.last_name = parts[0] || '';
        contact.first_name = parts[1] || '';
      } else if (line.startsWith('TEL')) {
        const phone = line.replace(/^TEL[^:]*:/, '').trim();
        if (!contact.phone) contact.phone = phone;
        else if (!contact.phone2) contact.phone2 = phone;
      } else if (line.startsWith('EMAIL')) {
        const email = line.replace(/^EMAIL[^:]*:/, '').trim();
        if (!contact.email) contact.email = email;
      } else if (line.startsWith('ORG:')) {
        contact.company = line.substring(4).split(';')[0].trim();
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
