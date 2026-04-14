'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { pullSync, type SyncProgress } from '@/lib/sync-service';

// 로그인 후 자동으로 풀 sync 실행. 진행 상황을 state로 노출.
export function useSync() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [ran, setRan] = useState(false);

  useEffect(() => {
    if (!user || ran) return;
    setRan(true);
    setBusy(true);
    pullSync(user.id, p => setProgress(p))
      .finally(() => setBusy(false));
  }, [user, ran]);

  const retry = () => {
    if (!user) return;
    setBusy(true);
    pullSync(user.id, p => setProgress(p))
      .finally(() => setBusy(false));
  };

  return { progress, busy, retry };
}
