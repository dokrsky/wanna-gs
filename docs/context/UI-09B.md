# UI-09B 컨텍스트 계약 · revision 1

2026-09-22 KST. 직전 UI09A `cfda3c90c670597dbfb50dc9325999276a8d753a`는 정확한 Ready 배포와 실제2호출·정책 저장/복원까지 진행했다. 이번은 실행 기록 구현이며 전체 goal 게이트를 먼저 요구하지 않는다.

## 목적·기준

- 경영주는 이번 묶음/정책 AI 시도, 취소·만료·중단, 관측한 모델 결과, 실제 화면 적용/정책 저장을 구분해 새로고침 뒤 조회할 수 있어야 한다. 로그 실패가 이미 성공한 정책을 다시 실행시키지 않는다.
- CORE-05/06/23/25/26, AC-07/08/26/29/31; D-44/45/46. card·CORE·02 hash는 UI09A 기준과 동일, 실제 파일을 확인한다.
- ADR006 adopted hash `f4bf5d3ecc30c47596efd83c7f15cc3bfec192822a188a6804fb157dae37e7f1` 규칙6~8 구현. ADR003/005 거래·부가기록 유지. 별도 정책 공백 없으면 새 ADR 절차를 추가하지 않는다.
- 기존 schema2 sourceHash `3d15fce9caf74e0293ce5908bb532cbd3dc69e4639df573b5f76553f1fc72bc0`, seed `b8058996893c45b4df9f8e5cd32ece2973ad7a7a3d5dc9399556d01d8a7d8864`. 알려진 v1/v2만 additive 이행, 모든 기존 행/receipt 원문·결과/archive/clock 보존, persist 전에 publish 금지, 실패 reset 금지.
- OpenAI 모델/서버 API/프롬프트 변경 없음. 실제 서버 키 비노출·기존 보호 Preview만. 계정 총 한도 unknown, 새 구매/쿼터 상향·Production 설정 변경 없음.

## 파일 소유·계약

- main이 `lib/domain/merchant-trace-types.ts` 초기 DTO를 정의하고 **Locke에게 단일 소유권 전달**한다. 변경은 main/Newton/Meitner 소비자 ACK 뒤 한다. `MerchantTraceCommand` 네 가지 start/finish/observe/apply, `MerchantRun`의 terminal/observation/application은 별도 축이다.
- Locke: lib/domain/types.ts·commands.ts·storage.ts·새 merchant-trace.ts/check.mjs·위 DTO 및 scripts/prepare-domain-sqlite.mjs의 필요한 검사. SQL/공통 도메인 단일 작성자. 기존 모델 계약 순수 파서 재사용, 고객/다른 점포 기록 노출 금지. 정책 apply는 해당 policy.set committed receipt의 문맥/설정 일치 확인.
- Newton: domain-workspace.tsx/.module.css·policy-assistant.tsx·새 merchant-run-history.tsx 및 해당 UI checker. DTO ACK 후 기존 두 AI 호출 수명주기에 기록 연결, 최근5개 이력과 영구 로그를 분리. 미완료/실패 로그 명시 재시도 UI, 모델 자동 재호출 금지. UI09A 확인 동작/수동 초안 보존.
- main: app/demo/page.tsx·새 browser-safe 기록 어댑터/공유 UI 포트·docs/package·통합·최소 build/비밀 검사·commit/Preview. 기록을 직렬화하고 안정된 동작 키로 재시도, 기록 중 busy가 AI 응답을 취소시키지 않도록 거래 busy와 구분한다. 권한은 현재 세션/세대/actor/store, 전환/늦은 응답을 새 세대로 이동하지 않는다.
- Meitner: 현재 읽기 전용 계약/receipt 경계 검토. main·Locke DTO와 UI 포트 ACK 뒤 좁은 독립 실행 검증, 구현 파일 소유 없음. 하위 관리자나 전체 QA 선행조건 없음.

## 확인할 정상/경계

- 현재 묶음 응답→화면 명시 적용, 미래/독립 정책 응답→최종 저장. 각각 실제 적용 여부와 command key, model/usage/실제 latency; 미관측 usage null.
- 실행 중 기록 저장으로 업무 동일 제안이 자가 만료되지 않음. 취소/문맥 변경/새로고침의 기존 시작 행은 성공으로 뒤집히지 않음. 늦게 관측한 결과는 terminal과 별도로 보존 가능.
- 성공한 정책 C의 receipt가 확인되면 적용 로그 L만 재시도. 결과 불명확 시 같은 C 확인, 새 모델/새 policy key 생성 금지. 새 모델 재시도에는 별도 run ID.
- 알려진 v2 실제 브라우저 사본 이행·기존 정책/픽업/검색 보존·새 이력 저장/복원. 자체 SQL/계약→좁은 독립 반례→작은 후보 build/Preview, 최종 G1~G6/독립 UX/eval은 후속.
