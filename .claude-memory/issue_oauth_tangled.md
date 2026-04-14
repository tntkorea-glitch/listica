---
name: OAuth 설정 꼬임 (liketica vs listica)
description: Google Cloud Console에 liketica/listica OAuth 클라이언트가 섞여있어 다음 세션에 정리 필요
type: project
originSessionId: 1a01f8a2-e5a3-45c4-abec-d1b739feaec5
---
Google Cloud Console OAuth 설정에 **liketica**와 **listica** 관련 클라이언트/프로젝트가 섞여있어 꼬인 상태로 발견됨 (2026-04-15).

현재 Supabase에 등록된 Google Provider:
- Client ID/Secret은 Supabase 대시보드(Authentication → Providers → Google)에서 직접 확인
- 평문 저장 안 함 (보안상; 이 메모리 파일은 .claude-memory/ 로 repo에 싱크되기 때문)
- 이게 어느 프로젝트(liketica? listica?) 소속인지 불명확
- 기존 OAuth 클라이언트는 한 번 삭제됐었음 (deleted_client 401 에러 → 새로 재발급)

**Why:** 지금 세션에선 배포/인증 문제 해결에 집중하느라 OAuth 클라이언트 출처를 정리 못 하고 넘어감. 구글 로그인은 일단 테스트 유보.

**How to apply:** 다음 세션에 처음 할 일 — **처음부터 확인부터 새로 시작한다** (사용자 요청):
1. https://console.cloud.google.com/apis/credentials 접속
2. 상단 프로젝트 선택기 눌러서 liketica / listica 등 관련 프로젝트 **전부 목록화** — 어느 프로젝트가 진짜인지 사용자와 같이 확인
3. 사용하지 않는 프로젝트의 OAuth 클라이언트는 정리(삭제) — 혼란 요소 제거
4. 살릴 프로젝트에 `Listica Web` OAuth 클라이언트 **새로 만들거나 기존 것 검증**
   - 승인된 JavaScript 출처: `https://listica-contact.vercel.app`, `http://localhost:3006`
   - 승인된 리디렉션 URI: `https://krnpicwujfkvbymtecsf.supabase.co/auth/v1/callback`
5. 정리된 Client ID/Secret을 Supabase Google Provider에 다시 등록
6. 구글 로그인 테스트
7. 나중에 `listica.co.kr` 도메인 구매 후 JavaScript 출처에 추가

현재 이메일/비번 로그인은 정상 동작. RLS 재귀 문제도 SQL로 해결 완료 (contacts/groups는 auth.uid()::text=user_id, contact_groups는 service_role only).
