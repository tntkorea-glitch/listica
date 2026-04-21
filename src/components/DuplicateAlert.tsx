'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  refreshKey?: number;
  onOpen: () => void;
}

export default function DuplicateAlert({ refreshKey = 0, onOpen }: Props) {
  const { getAccessToken } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/v1/contacts/duplicates?mode=exact', { headers });
      if (!res.ok) return;
      const result = await res.json();
      const groups = Array.isArray(result.data) ? result.data : [];
      setCount(groups.length);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (loading || count === 0) return null;

  return (
    <button
      onClick={onOpen}
      className="w-full bg-amber-50 hover:bg-amber-100 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2 text-sm text-amber-800 transition-colors"
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.964-.834-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <span className="flex-1 text-left font-medium">
        중복 연락처 <span className="text-amber-900 font-bold">{count}건</span> 발견 — 클릭해서 정리하기
      </span>
      <span className="text-xs text-amber-700 underline">정리</span>
    </button>
  );
}
