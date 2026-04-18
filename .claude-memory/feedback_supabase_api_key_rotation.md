---
name: Supabase Invalid API key 500 체크리스트
description: API route가 500 + "Invalid API key" 반환하면 Vercel env의 Supabase anon/service_role key가 구 값 — 재발급·업데이트 필요
type: feedback
originSessionId: 9947c209-bc2e-45ec-b5f8-26d74b8c4aef
---
프로덕션 API route에서 `500 Internal Server Error` + body `{"error":{"code":"INTERNAL","message":"Invalid API key"}}` 증상이면 **Vercel 환경변수의 Supabase key가 구 값**이다.

**Why:** 2026-04-19 contica 세션에서 로컬은 정상 동작했지만 contica.vercel.app에서 연락처 조회 시 500 발생. 원인은 Vercel에 6일 전 등록된 ANON/SERVICE_ROLE key가 Supabase의 **Asymmetric JWT keys(ES256) 전환** 이후 invalid 처리된 것. 사용자 session은 새 ES256으로 발급되는데 서버 측 API key는 구 HS256이라 Supabase 자체가 "Invalid API key" 거부. RLS/코드/OAuth와 무관.

**How to apply:**
1. 증상 확인: `curl -H "Authorization: Bearer <user_jwt>" https://<앱>/api/v1/...` → 500 + "Invalid API key"
2. Supabase 대시보드 Project Settings → API Keys에서 현재 `anon` / `service_role` 값 확인·복사
3. Vercel env 갱신:
   ```
   vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY <env> --yes
   printf '%s' "<새값>" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY <env>
   ```
   (`<env>`: production / preview / development 각각 반복. 한 줄에 여러 env 지정은 CLI 버그로 실패)
4. 빈 커밋 푸시로 재배포 트리거 (env 변경만으론 자동 재배포 안 됨)
5. curl로 200 확인

**부가 교훈:** 이 상황에서 `supabase.auth.getUser(token)` 내부적으로 Supabase API 호출하는데, ANON key가 invalid면 auth도 막혀서 401이 먼저 나올 수 있음. 실제 500으로 떨어지는 건 **requireAuth를 통과한 후 contacts 쿼리 실행 시점**. 401·500 증상 혼재 가능.
