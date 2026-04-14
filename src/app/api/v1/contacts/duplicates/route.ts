import { NextRequest } from 'next/server';
import { supabase, fetchAllRows } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { apiError, apiSuccess, ErrorCodes } from '@/lib/errors';
import type { Contact } from '@/lib/types';

// GET /api/v1/contacts/duplicates — 중복 + 유사 연락처 검출
// ?mode=exact (기본) | similar
export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const mode = request.nextUrl.searchParams.get('mode') || 'exact';

  const { data: contacts, error: dbError } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', user!.id)
    .is('deleted_at', null);

  if (dbError) {
    return apiError(ErrorCodes.INTERNAL, dbError.message);
  }

  if (!contacts?.length) {
    return apiSuccess([]);
  }

  if (mode === 'similar') {
    return apiSuccess(findSimilar(contacts as Contact[]));
  }

  return apiSuccess(findExact(contacts as Contact[]));
}

// 정확 일치: 이름 또는 전화번호 완전 일치
function findExact(contacts: Contact[]) {
  const groups: Map<string, Contact[]> = new Map();

  for (const c of contacts) {
    const nameKey = `${c.last_name}${c.first_name}`.trim().toLowerCase();
    const phoneKey = c.phone?.replace(/[^0-9]/g, '') || '';

    let matched = false;
    for (const [, group] of groups) {
      const ref = group[0];
      const refName = `${ref.last_name}${ref.first_name}`.trim().toLowerCase();
      const refPhone = ref.phone?.replace(/[^0-9]/g, '') || '';

      if ((nameKey && nameKey === refName) || (phoneKey && phoneKey === refPhone)) {
        group.push(c);
        matched = true;
        break;
      }
    }

    if (!matched) {
      groups.set(c.id, [c]);
    }
  }

  return Array.from(groups.values()).filter(g => g.length > 1);
}

// 유사 연락처: 이메일 도메인, 전화번호 유사, 이름 부분 일치
function findSimilar(contacts: Contact[]) {
  const groups: Contact[][] = [];
  const used = new Set<string>();

  for (let i = 0; i < contacts.length; i++) {
    if (used.has(contacts[i].id)) continue;

    const group: Contact[] = [contacts[i]];
    used.add(contacts[i].id);

    for (let j = i + 1; j < contacts.length; j++) {
      if (used.has(contacts[j].id)) continue;

      if (isSimilar(contacts[i], contacts[j])) {
        group.push(contacts[j]);
        used.add(contacts[j].id);
      }
    }

    if (group.length > 1) {
      groups.push(group);
    }
  }

  return groups;
}

function isSimilar(a: Contact, b: Contact): boolean {
  const nameA = `${a.last_name}${a.first_name}`.trim().toLowerCase();
  const nameB = `${b.last_name}${b.first_name}`.trim().toLowerCase();
  const phoneA = a.phone?.replace(/[^0-9]/g, '') || '';
  const phoneB = b.phone?.replace(/[^0-9]/g, '') || '';

  // 전화번호 끝 8자리 일치 (국가번호 제외)
  if (phoneA.length >= 8 && phoneB.length >= 8) {
    if (phoneA.slice(-8) === phoneB.slice(-8)) return true;
  }

  // 이름 부분 포함 (3글자 이상이면서 한쪽이 다른쪽 포함)
  if (nameA.length >= 3 && nameB.length >= 3) {
    if (nameA.includes(nameB) || nameB.includes(nameA)) return true;
  }

  // 이메일 주소 동일 (도메인 제외)
  const emailA = (a.email || '').split('@')[0]?.toLowerCase();
  const emailB = (b.email || '').split('@')[0]?.toLowerCase();
  if (emailA && emailB && emailA === emailB) return true;

  return false;
}
