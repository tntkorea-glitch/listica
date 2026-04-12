import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/contacts - 연락처 목록 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '30');
  const sortField = searchParams.get('sortField') || 'last_name';
  const sortDir = (searchParams.get('sortDirection') || 'asc') as 'asc' | 'desc';
  const search = searchParams.get('search') || '';
  const groupId = searchParams.get('groupId') || '';
  const favoriteOnly = searchParams.get('favorite') === 'true';

  const offset = (page - 1) * limit;

  let query = supabase
    .from('contacts')
    .select('*, contact_groups(group_id)', { count: 'exact' });

  // 검색
  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`
    );
  }

  // 즐겨찾기 필터
  if (favoriteOnly) {
    query = query.eq('favorite', true);
  }

  // 그룹 필터
  if (groupId) {
    const { data: contactIds } = await supabase
      .from('contact_groups')
      .select('contact_id')
      .eq('group_id', groupId);

    if (contactIds && contactIds.length > 0) {
      query = query.in('id', contactIds.map(c => c.contact_id));
    } else {
      return NextResponse.json({ contacts: [], total: 0, page, limit });
    }
  }

  // 정렬 + 페이지네이션
  const { data, error, count } = await query
    .order(sortField, { ascending: sortDir === 'asc' })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    contacts: data || [],
    total: count || 0,
    page,
    limit,
  });
}

// POST /api/contacts - 연락처 생성
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { groups: groupIds, ...contactData } = body;

  const { data, error } = await supabase
    .from('contacts')
    .insert(contactData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 그룹 연결
  if (groupIds && groupIds.length > 0 && data) {
    await supabase.from('contact_groups').insert(
      groupIds.map((gid: string) => ({ contact_id: data.id, group_id: gid }))
    );
  }

  // 동기화 로그
  await supabase.from('sync_log').insert({
    action: 'create',
    contact_id: data.id,
    device_id: body.device_id || 'web',
  });

  return NextResponse.json(data, { status: 201 });
}
