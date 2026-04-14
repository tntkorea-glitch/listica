'use client';

import { useState } from 'react';

interface DuplicateSample {
  incoming: { last_name: string; first_name: string; phone: string; email: string; company: string };
  existing: { id: string; last_name: string; first_name: string; phone: string; email: string | null };
  matched_by: 'phone' | 'email';
}

interface NewSample {
  last_name: string; first_name: string; phone: string; email: string; company: string;
}

interface PreviewResult {
  total: number;
  new_count: number;
  duplicate_count: number;
  new_samples: NewSample[];
  duplicate_samples: DuplicateSample[];
}

interface ImportModalProps {
  onPreview: (file: File) => Promise<PreviewResult | null>;
  onSave: (file: File, skipDuplicates: boolean) => Promise<void>;
  onClose: () => void;
}

export default function ImportModal({ onPreview, onSave, onClose }: ImportModalProps) {
  const [step, setStep] = useState<'pick' | 'analyzing' | 'review' | 'saving'>('pick');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [errMsg, setErrMsg] = useState('');
  const [tab, setTab] = useState<'new' | 'duplicate'>('new');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setStep('analyzing');
    setErrMsg('');
    try {
      const result = await onPreview(f);
      if (!result) throw new Error('미리보기 실패');
      setPreview(result);
      setTab(result.new_count > 0 ? 'new' : 'duplicate');
      setStep('review');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : '파일 분석 중 오류');
      setStep('pick');
      setFile(null);
    }
  };

  const handleSave = async () => {
    if (!file) return;
    setStep('saving');
    try {
      await onSave(file, skipDuplicates);
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : '저장 중 오류');
      setStep('review');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">연락처 가져오기</h2>
          {step !== 'analyzing' && step !== 'saving' && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'pick' && (
            <>
              <p className="text-sm text-gray-500 mb-4">
                엑셀(.xlsx) 또는 vCard(.vcf) 파일을 선택하면<br />
                기존 연락처와 비교 후 신규/중복을 확인해 드립니다.
              </p>
              {errMsg && <div className="mb-3 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg">{errMsg}</div>}
              <label className="block w-full p-10 border-2 border-dashed border-gray-300 rounded-xl text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
                <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm text-gray-600 font-medium">파일을 선택하세요 (.xlsx · .xls · .vcf)</span>
                <input type="file" accept=".xlsx,.xls,.vcf" onChange={handleFile} className="hidden" />
              </label>
            </>
          )}

          {step === 'analyzing' && (
            <div className="py-12 text-center">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-700 font-medium">{file?.name}</p>
              <p className="text-xs text-gray-500 mt-2">기존 연락처와 비교 중...</p>
            </div>
          )}

          {step === 'review' && preview && (
            <>
              <div className="mb-4 text-sm text-gray-700">
                <span className="font-medium">{file?.name}</span> · 총 <b>{preview.total.toLocaleString()}</b>건
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="p-4 bg-gray-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-gray-800">{preview.total.toLocaleString()}</div>
                  <div className="text-xs text-gray-500 mt-1">전체</div>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-emerald-600">{preview.new_count.toLocaleString()}</div>
                  <div className="text-xs text-emerald-700 mt-1">신규</div>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-amber-600">{preview.duplicate_count.toLocaleString()}</div>
                  <div className="text-xs text-amber-700 mt-1">중복</div>
                </div>
              </div>

              {preview.duplicate_count > 0 && (
                <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={e => setSkipDuplicates(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600"
                  />
                  <span className="text-sm text-gray-700">
                    중복 연락처 <b>{preview.duplicate_count.toLocaleString()}</b>건 제외하고 저장
                  </span>
                </label>
              )}

              {(preview.new_count > 0 || preview.duplicate_count > 0) && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex border-b border-gray-200 bg-gray-50">
                    <button
                      onClick={() => setTab('new')}
                      disabled={preview.new_count === 0}
                      className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${tab === 'new' ? 'bg-white text-emerald-700 border-b-2 border-emerald-500 -mb-px' : 'text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed'}`}
                    >
                      신규 {preview.new_count.toLocaleString()}건
                    </button>
                    <button
                      onClick={() => setTab('duplicate')}
                      disabled={preview.duplicate_count === 0}
                      className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${tab === 'duplicate' ? 'bg-white text-amber-700 border-b-2 border-amber-500 -mb-px' : 'text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed'}`}
                    >
                      중복 {preview.duplicate_count.toLocaleString()}건
                    </button>
                  </div>

                  {tab === 'new' && (
                    <div className="max-h-72 overflow-y-auto">
                      <div className="px-4 py-2 bg-emerald-50 text-[11px] text-emerald-700 border-b border-emerald-100">
                        등록될 신규 연락처 미리보기 (최대 50건)
                      </div>
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr className="text-gray-500">
                            <th className="px-3 py-2 text-left font-medium">이름</th>
                            <th className="px-3 py-2 text-left font-medium">전화번호</th>
                            <th className="px-3 py-2 text-left font-medium">이메일</th>
                            <th className="px-3 py-2 text-left font-medium">회사·소속</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.new_samples.map((s, i) => (
                            <tr key={i} className="border-t border-gray-100">
                              <td className="px-3 py-2 font-medium text-gray-700">{s.last_name}{s.first_name || <span className="text-gray-400">—</span>}</td>
                              <td className="px-3 py-2 text-gray-600">{s.phone || <span className="text-gray-400">—</span>}</td>
                              <td className="px-3 py-2 text-gray-500 truncate max-w-[180px]">{s.email || <span className="text-gray-400">—</span>}</td>
                              <td className="px-3 py-2 text-gray-500 truncate max-w-[140px]">{s.company || <span className="text-gray-400">—</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {tab === 'duplicate' && (
                    <div className="max-h-72 overflow-y-auto">
                      <div className="px-4 py-2 bg-amber-50 text-[11px] text-amber-700 border-b border-amber-100">
                        중복 항목 (최대 50건) — 매칭 기준: 전화번호 끝 8자리 / 이메일
                      </div>
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr className="text-gray-500">
                            <th className="px-3 py-2 text-left font-medium w-14">매칭</th>
                            <th className="px-3 py-2 text-left font-medium">새 파일</th>
                            <th className="px-3 py-2 text-left font-medium">기존 연락처</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.duplicate_samples.map((s, i) => (
                            <tr key={i} className="border-t border-gray-100">
                              <td className="px-3 py-2">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${s.matched_by === 'phone' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                  {s.matched_by === 'phone' ? '전화' : '이메일'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-gray-700">
                                <div className="font-medium">{s.incoming.last_name}{s.incoming.first_name}</div>
                                <div className="text-gray-500">{s.incoming.phone}</div>
                                {s.incoming.email && <div className="text-gray-400 truncate max-w-[180px]">{s.incoming.email}</div>}
                              </td>
                              <td className="px-3 py-2 text-gray-700">
                                <div className="font-medium">{s.existing.last_name}{s.existing.first_name}</div>
                                <div className="text-gray-500">{s.existing.phone}</div>
                                {s.existing.email && <div className="text-gray-400 truncate max-w-[180px]">{s.existing.email}</div>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {errMsg && <div className="mt-3 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg">{errMsg}</div>}
            </>
          )}

          {step === 'saving' && (
            <div className="py-12 text-center">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-700 font-medium">저장 중...</p>
              <p className="text-xs text-gray-500 mt-2">대용량은 시간이 걸릴 수 있습니다</p>
            </div>
          )}
        </div>

        {step === 'review' && preview && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={skipDuplicates && preview.new_count === 0}
              className="px-5 py-2 text-sm bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {skipDuplicates
                ? `신규 ${preview.new_count.toLocaleString()}건 저장`
                : `전체 ${preview.total.toLocaleString()}건 저장`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
