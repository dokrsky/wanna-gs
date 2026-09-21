# UI-09A 컨텍스트 계약 · revision 1

2026-09-21 조정자. 파일 SHA256은 전달 ACK와 PROGRESS에 기록한다. UI08 두 Ready 배포와 픽업 복원은 이전 turn의 진행이며 새 검증으로 합산하지 않는다.

## 기준·목적

- branch `codex/ui-preview-20260921`, base `af1dce1d5144ba2378d2016ed607edbd965ab51a`, 기존 draft PR #1. 로컬/보호된 Preview만, Production 불변.
- 경영주가 최근 선택/예산 변경을 자연어로 복원하고 현재 선택을 앞으로의 정책 초안으로 옮길 수 있어야 한다. 현재 묶음 적용·정책 최종확인·발주 승인은 서로 구분한다.
- CORE-05/06/23/25/26, AC-07/08/26/29/31. D-44/45/46; card.md·CORE·02 원장 hash는 UI-08 계약과 같으며 재개 시 파일과 대조한다.
- ADR-003/005 유지, ADR-006 adopted v2 hash `f4bf5d3ecc30c47596efd83c7f15cc3bfec192822a188a6804fb157dae37e7f1` 적용. 두 독립 정책 검토는 완료, 앱 품질/실행 검증은 아니다. supersedes/conflicts 없음.
- 포함: 최근 적용5개, 합집합 복원/편집 완료 예산 이력, 현재 후보·UI 문맥 검사, 명시 정책 초안 전달, 20개 초과 유효 선택 지원, 자체 검사와 작은 Preview.
- 제외: 이번 단위의 SQLite/도메인 schema 변경·영구 실행 이력(UI09B 다음), 고객 검색/동의/수량/FIFO/모의 결제/48시간 변경, 실제 GS 연동/과금. 전체 goal의 기록·최종 검증 요구는 제거하지 않는다.

## 소유권·전달

- Meitner `01a0c40b-66e4-76e3-93a0-ac10d87259c9`: 경영주 v2 공유 API 계약/순수 해석 검증/helper와 서버 구현·route·자체 check. 기존 고객/정책 API 계약을 유지한다. 먼저 정확한 type/function 계약을 main/Newton에게 보내 소비자 ACK 뒤 같은 계약을 구현한다.
- Newton `01a0c40d-fd69-7871-a336-8f84e14787ed`: domain-workspace.tsx/.module.css, policy-assistant.tsx 및 필요시 새 merchant-context UI 컴포넌트. 기존 확인 화면 재사용, 서버 계약 읽기 전용. 공통 schema/lockfile/package 수정 금지.
- main: 문서/manifest·통합·package script·빌드/키 검사·Git/Preview·소량 live 기본 동작. 공유 코드 handback 전 동시 편집하지 않는다.
- Locke `01a0c40b-6761-7302-877f-f9a9bc997484`: 현재 대기, UI09A 통합 시 좁은 독립 계약 검토. SQL 수정은 UI09B 명시 배정 뒤 단일 작성한다.
- 소비자 ACK 전 UI의 정적 문맥 안내/기존 컴포넌트 경계 준비만 가능. 결과는 consumed_context_hash, 변경 파일, 실제 실행/미실행을 반환한다. 전용 code fingerprint와 wire 계약 변경 통지는 PROGRESS에 연결한다.

## 유지할 계약·증거

- schema2 sourceHash `3d15fce9caf74e0293ce5908bb532cbd3dc69e4639df573b5f76553f1fc72bc0`, seed `b8058996893c45b4df9f8e5cd32ece2973ad7a7a3d5dc9399556d01d8a7d8864`, 고객 API/dialogue/거래 명령 불변.
- runtime OpenAI gpt-5-mini live, 구조화 출력·서버 키·timeout/usage 경계 재사용. 기존 official Responses/Structured Outputs 근거와 설치 SDK를 확인하고 새 기능/API를 채택할 때만 필요한 공식 근거를 추가한다. 계정 전체 잔액/한도 unknown, 새 구매/한도 상향 없음.
- 개발 agent는 기존 3개 도구 ID/상속 모델 사용, 별도 override 없음(구체 상속 모델명 미기록). Node24/gh/Vercel/CUA는 앞선 실제 실행으로 확인했으며 현재 도구 catalog 재사용.
- 조사: ADR006의 synthetic A/B제외+C추가·예산/로그 반례를 사용한다. 새 GS 시장 사실·외부 라이브러리 채택 없음. 실제 사용성/자연어 품질 근거로 과장하지 않는다.
- 자체 정상/경계/실패 검사→정확 후보 build/키 비노출→소규모 commit/push/Ready→실제 이번묶음/정책 초안 UI 확인. whole-goal G1~G6/평가/두 역할 독립 UX는 후속이며 선언하지 않는다.
- 업무 상태와 무관한 입력 이력/로그로 정상 흐름을 막지 않는다. 취소·낡음·입력 보존과 수동 경로, 이미 성공한 명령의 중복 실행 금지를 유지한다.
