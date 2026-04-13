'use client';

import type { Contact } from '@/lib/types';

export default function DuplicatesModal({ groups, onMerge, onClose }: {
  groups: Contact[][];
  onMerge: (ids: string[], primaryId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-800">
            중복 연락처 ({groups.length}그룹)
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {groups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>중복된 연락처가 없습니다!</p>
            </div>
          ) : (
            groups.map((group, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    {group.length}개의 중복 연락처
                  </span>
                  <button
                    onClick={() => onMerge(group.map(c => c.id), group[0].id)}
                    className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    첫 번째로 병합
                  </button>
                </div>
                {group.map(c => (
                  <div key={c.id} className="flex items-center gap-3 py-2 border-t border-gray-100">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                      {(c.last_name || c.first_name || '?')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800">
                        {[c.last_name, c.first_name].filter(Boolean).join(' ') || '이름 없음'}
                      </div>
                      <div className="text-xs text-gray-500">{c.phone} {c.email ? `| ${c.email}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
