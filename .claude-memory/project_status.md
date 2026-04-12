---
name: Project Status
description: naver-contact 프로젝트 현재 진행 상태 및 다음 작업
type: project
originSessionId: 02e7d58b-3e27-49f6-afe9-6ca2d94ff07b
---
네이버주소록 클론 프로젝트 - 다중 기기 연락처 실시간 동기화 앱

## 완료된 작업 (2026-04-13)
- Next.js + TypeScript + Tailwind 프로젝트 셋업
- Supabase 스키마 설계 (contacts, groups, contact_groups, sync_log)
- API 라우트: 연락처 CRUD, 그룹 CRUD, 중복감지, 병합, vCard import/export
- 메인 UI: 사이드바, 연락처 목록(초성 그룹화), 상세보기, 추가/수정 폼
- 실시간 동기화 (Supabase Realtime 구독)
- 빌드 성공 확인

## Supabase 설정
- Organization: milveus-glitch's Project (Pro Plan $25/월)
- Project URL: https://krnpicwujfkvbymtecsf.supabase.co
- Region: Northeast Asia (Seoul)

## Next up when resuming
1. **Supabase anon key 가져오기**: API Settings 페이지에서 anon public 키 복사 → .env.local에 설정
2. **Supabase에 스키마 SQL 실행**: SQL Editor에서 supabase-schema.sql 실행
3. **dev 서버 실행 + 기능 테스트**
4. **Vercel 배포 + 환경변수 설정**
5. 핸드폰에서 실시간 동기화 테스트

**Why:** 사용자가 Supabase API keys 페이지에서 anon key 찾는 중에 세션 종료
**How to apply:** 다음 세션 시작 시 anon key 설정부터 이어서 진행
