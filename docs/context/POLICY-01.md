# POLICY-01 화면 입력 크기 복구 · revision 1

2026-09-22 KST, base UI11 `e2450fd`, D-46 작은 수정·Preview 우선.

## 목적·계약

CORE-05/06/23/25, ADR003/006. 저장된 유효 정책 대상262개를 자연어로 변경 제안받을 수 있어야 한다. 명시 최종 확인/저장·OFF/ON·예산·대상/동의·기존 발주 불변을 유지한다. 현재 DATA02의 API/trace 공통 `POLICY_BODY_BYTES=8192`가 유효 계약이며 정책 UI만4096B다. 전체 대상/짧은 한글 요청4,284B가 fetch 전에 거절되는 코드 반례(Planck 독립 발견)다. 새 정책 결정·모델·키·SQL·schema·seed 변경은 없다.

card `62fae686c1967902ac443a0a315f4c7f59f76df9e6de3a3568e4355d6e334e03`, CORE `65c7541d3549bf49b715da687aa5af060fce9a48e774a4130d9ac350349d8114`. 최신 index/유효 ADR와 docs09/13/14/15/20 및 verify/recovery/ponytail을 직접 읽고 실제 hash·소유권 ACK를 한다. DATA02 sourceHash `88f9d52f3a8dea7fa72e2f058b4c2ac3e90c0a6c5de4a60f2963437aa49f1672`,262상품/524조건/schema3. 실제 모델 호출은 이번 크기 경계 검사에 필요하지 않다.

## 소유권·작업

- main: `app/components/policy-assistant.tsx` 공통 상수 import/대체2줄, 공유 docs/build/git/Preview.
- checker worker: `app/components/policy-request-ui.check.mjs` 하나만. 실제 TSX의 propose 또는 필요한 실제 전송 전 구간을 AST로 추출해 실행한다. 검사 복제 로직만 실행하지 않는다. 기존 TS transpile/assert 패턴 재사용, 새 라이브러리·런타임 추상화·package 수정 없음.
- independent reviewer: main/worker와 다른 agent, 변경/새 checker·실제 소비자/API/trace 일치만 read-only 검토·실행. 전체 goal QA 아님.

## 사전 기대값·검증

1. 수정 전4096 UI의 전체262대상/유효 한글 입력을 RED로 재현하고 같은 실제 UI 경로 수정 후 GREEN.
2. 전체대상·한글300자 전송 허용/301자 거절, 실제 UTF-8 wire8192B 허용·8193B 전송 전 거절. 경계를 만들기 위해 합성 catalog ID를 썼다면 명시하고 실제262 사례와 구분한다.
3. 초과/유효하지 않은 입력 fetch/trace/정책 저장0; 정상 전송도 명시 승인 없이 onSave0. 화면의 확인/저장과 응답 strict 계약은 변경하지 않는다.
4. worker 자체 검사를 독립 검토로 세지 않는다. main build/기존 policy API·trace 인접 검사, 좁은 독립 판정 후 commit/push→정확한Ready.

첫 worker 인계5분, 더 넓은 최적화·전체 QA·정책 ADR 채택을 이번 작은 Preview의 선행조건으로 추가하지 않는다. 사용자 `.idea/`·`.env.local`·Production 보존. 결과와 남은 실제 브라우저/전체 검증을 PROGRESS에 분리한다.
