'use client';

import { useState } from 'react';
import { Contact, Group } from '@/lib/supabase';

function formatKoreanPhone(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('02')) {
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}-${d.slice(2)}`;
    if (d.length <= 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}`;
  }
  if (/^1[5-9]\d{2}$/.test(d.slice(0, 4)) && d.length === 8) {
    return `${d.slice(0, 4)}-${d.slice(4)}`;
  }
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
}

interface ContactFormProps {
  contact?: Contact | null;
  groups: Group[];
  onSave: (data: Omit<Partial<Contact>, 'groups'> & { groups?: string[] }) => void;
  onCancel: () => void;
}

export default function ContactForm({ contact, groups, onSave, onCancel }: ContactFormProps) {
  const [form, setForm] = useState({
    last_name: contact?.last_name || '',
    first_name: contact?.first_name || '',
    phone: contact?.phone || '',
    phone2: contact?.phone2 || '',
    email: contact?.email || '',
    email2: contact?.email2 || '',
    company: contact?.company || '',
    position: contact?.position || '',
    address: contact?.address || '',
    memo: contact?.memo || '',
    favorite: contact?.favorite || false,
  });

  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(
    new Set(
      (contact as Contact & { contact_groups?: { group_id: string }[] })?.contact_groups?.map(
        (cg: { group_id: string }) => cg.group_id
      ) || []
    )
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...form, groups: Array.from(selectedGroups) });
  };

  const update = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleGroup = (id: string) => {
    setSelectedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-800">
            {contact ? '연락처 수정' : '새 연락처'}
          </h2>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-full">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 이름 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">성</label>
              <input
                type="text"
                value={form.last_name}
                onChange={e => update('last_name', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="홍"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">이름</label>
              <input
                type="text"
                value={form.first_name}
                onChange={e => update('first_name', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="길동"
              />
            </div>
          </div>

          {/* 전화번호 */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-500">전화번호</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => update('phone', formatKoreanPhone(e.target.value))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="010-1234-5678"
            />
            <input
              type="tel"
              value={form.phone2}
              onChange={e => update('phone2', formatKoreanPhone(e.target.value))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="전화번호 2 (선택)"
            />
          </div>

          {/* 이메일 */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-500">이메일</label>
            <input
              type="email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="email@example.com"
            />
            <input
              type="email"
              value={form.email2}
              onChange={e => update('email2', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="이메일 2 (선택)"
            />
          </div>

          {/* 회사/직위 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">회사</label>
              <input
                type="text"
                value={form.company}
                onChange={e => update('company', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="회사명"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">직위</label>
              <input
                type="text"
                value={form.position}
                onChange={e => update('position', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="직위/직함"
              />
            </div>
          </div>

          {/* 주소 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">주소</label>
            <input
              type="text"
              value={form.address}
              onChange={e => update('address', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="서울시 강남구..."
            />
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">메모</label>
            <textarea
              value={form.memo}
              onChange={e => update('memo', e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
              placeholder="메모..."
            />
          </div>

          {/* 그룹 선택 */}
          {groups.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">그룹</label>
              <div className="flex flex-wrap gap-2">
                {groups.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGroup(g.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      selectedGroups.has(g.id)
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={selectedGroups.has(g.id) ? { backgroundColor: g.color } : {}}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedGroups.has(g.id) ? 'white' : g.color }} />
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 즐겨찾기 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.favorite}
              onChange={e => update('favorite', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
            />
            <span className="text-sm text-gray-600">즐겨찾기에 추가</span>
          </label>

          {/* 버튼 */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              {contact ? '수정 완료' : '연락처 추가'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
