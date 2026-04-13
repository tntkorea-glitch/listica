'use client';

import { useState } from 'react';

type Tab = 'general' | 'groups' | 'restore' | 'privacy';

interface SettingsModalProps {
  settings: { sortField: string; sortDirection: string; pageSize: number };
  onSave: (settings: { sortField: string; sortDirection: string; pageSize: number }) => void;
  onRestore?: () => void;
  onClose: () => void;
}

export default function SettingsModal({ settings, onSave, onClose }: SettingsModalProps) {
  const [tab, setTab] = useState<Tab>('general');
  const [sortField, setSortField] = useState(settings.sortField);
  const [sortDirection, setSortDirection] = useState(settings.sortDirection);
  const [pageSize, setPageSize] = useState(settings.pageSize);

  const handleSave = () => {
    onSave({ sortField, sortDirection, pageSize });
    onClose();
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'general', label: '일반 설정' },
    { key: 'groups', label: '내 주소록의 그룹 관리' },
    { key: 'restore', label: '연락처 복원' },
    { key: 'privacy', label: '프라이버시 보호 설정' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* 헤더 */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">환경설정</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-200 px-6">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">화면 설정</h3>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 text-gray-600 w-32">첫 화면 설정</td>
                      <td className="py-3">
                        <label className="inline-flex items-center gap-2 mr-4">
                          <input type="radio" checked className="accent-indigo-600" readOnly /> 내 연락처
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input type="radio" className="accent-indigo-600" disabled /> 중요 연락처
                        </label>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 text-gray-600">목록 정렬 기준</td>
                      <td className="py-3 flex gap-3">
                        {[
                          { v: 'last_name-asc', l: '가나다순' },
                          { v: 'updated_at-desc', l: '최근연락순' },
                          { v: 'created_at-desc', l: '최근등록순' },
                        ].map(opt => (
                          <label key={opt.v} className="inline-flex items-center gap-2">
                            <input
                              type="radio"
                              name="sort"
                              checked={`${sortField}-${sortDirection}` === opt.v}
                              onChange={() => {
                                const [f, d] = opt.v.split('-');
                                setSortField(f);
                                setSortDirection(d);
                              }}
                              className="accent-indigo-600"
                            />
                            {opt.l}
                          </label>
                        ))}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 text-gray-600">목록 노출 개수</td>
                      <td className="py-3">
                        <select
                          value={pageSize}
                          onChange={e => setPageSize(Number(e.target.value))}
                          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                        >
                          {[10, 20, 30, 50, 100].map(n => (
                            <option key={n} value={n}>{n}개씩 보여줍니다.</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'groups' && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-sm">그룹 관리는 사이드바에서 직접 추가/삭제 할 수 있습니다.</p>
              <p className="text-xs text-gray-400 mt-2">* 그룹명은 최대 25자, 그룹 설명은 최대 100자까지 입력 가능합니다.</p>
            </div>
          )}

          {tab === 'restore' && (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                * 주소록 복원은 30일 이내의 특정일을 선택하시면 그 날 사용하셨던 기능 실행 이전 상태로 복원됩니다.
              </p>
              <div className="border border-gray-200 rounded-lg">
                <div className="flex border-b border-gray-200 text-sm font-medium text-gray-600">
                  <div className="px-4 py-3 w-1/2">복원되는 시점</div>
                  <div className="px-4 py-3 w-1/2">복원 시 취소되는 액션</div>
                </div>
                <div className="text-center py-8 text-sm text-gray-400">
                  <p className="text-indigo-500 font-medium">최근 30일 이내에 복원 가능한 연락처 변동사항이 없습니다.</p>
                  <p className="mt-2">연락처 추가, 삭제, 변경 등의 액션이 있으면 이전 상태로 복원이 가능합니다.</p>
                </div>
              </div>
            </div>
          )}

          {tab === 'privacy' && (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                * 프라이버시 보호 설정 시 주소록 서비스에 접근할 때 추가 인증이 필요하며, 보안을 강화할 수 있습니다.
              </p>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">프라이버시 보호 설정</span>
                <span className="text-sm text-gray-400">사용 안함</span>
              </div>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        {tab === 'general' && (
          <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">취소</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">확인</button>
          </div>
        )}
      </div>
    </div>
  );
}
