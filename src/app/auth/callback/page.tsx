'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// OAuth redirect landing page.
// Supabase JS v2의 detectSessionInUrl이 ?code= 를 자동으로 처리해 세션을 생성.
// 그 후 홈으로 이동.
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const go = async () => {
      // URL 에 code 가 있으면 exchange — v2는 detectSessionInUrl=true가 기본이라 자동 처리되지만
      // 명시적으로 한 번 더 getSession을 호출해 상태 확정
      await supabase.auth.getSession();
      if (!cancelled) router.replace('/');
    };
    go();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-500">로그인 처리 중...</p>
      </div>
    </div>
  );
}
