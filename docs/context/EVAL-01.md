# EVAL-01 평가 자료·오프라인 검증 계약 · revision2

2026-09-22 KST, base `ffdca60bf729eece37d3d0e8d07d0cb31a46d845`. D-46의 구현/Preview를 유지하고 ADR002 revision2의 실제 평가 자료를 준비한다. 이번 작업은 live baseline/전체 제품 게이트 PASS가 아니다. 비용 상한 답변 전 provider 호출0회.

## 목적·기준

고객의 정확한 상품 확인·정정과 경영주의 이번 묶음/지속 정책 해석을 정상/모호/미식별/거절로 분리 평가한다. CORE03/05/11/21/22/23/25/26, D44/45/46, ADR002 revision2, docs19/21/23/24·card를 따른다. 기존 기능·모델·prompt·seed·동의·48시간을 바꾸지 않는다. 공개 smoke/화면 예시는 dev만, 보호 holdout은 구현자에게 노출하지 않는다.

## 소유권

- main: `scripts/eval-dataset.mjs`, `scripts/eval-dataset.check.mjs`, `evals/README.md`, 공통 manifest와 package/quality 등록·공유 문서.
- customer curator: `evals/customer.json`, `artifacts/private/evals/customer-holdout.json`, 공개 집계 `evals/customer-holdout-summary.json`만. 앱/프롬프트 구현자가 아닌 별도 평가 역할.
- merchant curator: 위 customer 대신 merchant 세 파일만. 고객 curator와 서로 다른 역할. 앱/프롬프트/seed 수정 금지.
- 별도 reviewer: 완성한 공개 자료와 validator 반례·계약 일치만 독립 검토. 보호 holdout 원문은 담당 평가자만 접근하고 이번에는 main/구현 reviewer에게 전달하지 않는다.
- store researcher: 별도 `docs/research/goal-20260922/store-origin-followup.md`만. 기존 미해결 원배포 좌표/재이용조건을 bounded 조사, 데이터 쓰기/전체 QA 판정 금지.

## 평가 pack v1 (기계 계약)

JSON `{version:1, evalVersion:"EVAL-01-20260922-v2", role:"customer"|"merchant", cases:[...]}`.

각 case 필수:

`{id, split, group, scenarioId, researchCaseIds, origin, riskTags, slice, normalCompletion, service, context, steps, rationale}`

- id/group/scenarioId는 안정 ASCII 식별자. group은 동일 필요·의도·상품/상태의 모든 말투/오타 변형을 묶는다. split은 dev/validation/holdout. 공개 pack은 dev+validation만, private pack은 holdout만. origin은 synthetic_expansion. researchCaseIds는 실제 현재 연구 ID 배열(프로젝트 안전 요구 파생은 CORE-* 가능); rationale은 합성 여부·정답 근거를 한국어로 명시한다.
- riskTags는 역할별 최소7개: customer `identity, lexical, attributes, ambiguity, unknown, correction, safety`; merchant `selection, budget, scope, context, ambiguity, unknown, safety`. 합당한 중첩만 허용하고 tag 수를 맞추려고 관계없는 위험을 붙이지 않는다.
- slice는 clear/ambiguous/unknown/correction/refusal 중1개. normalCompletion은 clear 및 정정 후 정상완료 true, 순수 모호/미식별/거절 false. 각 역할 validation/holdout 정상 완료 가능한 case≥절반, 모든 적용 slice 및 riskTag≥3독립family. clear95%, 나머지slice90%, risk85%의 ceil 최소성공수를 사전집계한다.
- service는 search/merchant/policy. customer는 search, merchant는 merchant 또는 policy. context는 API의 text/id/generation 제외 필드. search는 `{}`(대화는 실행기가 만든다). merchant는 현재 v2 API의 storeId/budgetWon/selectedProductIds/context, policy는 storeId/currentPolicy를 담는다. 서버나 SQLite 실제 권한 증거가 아닌 합성 시나리오 상태다.
- steps는 1~3개 `{text, expect, semanticChecks}`. text 1~300자. search 후속은 실제 앞 응답의 clarify 질문에 대한 답이며 초기 조건/정정을 유지한다. merchant는 이번 준비에서 실제 context가 고정된 1step로 하며 문맥 이력은 context에 둔다.
- expect는 응답 필드의 기계 정답. search `{status:[...], allowedCandidateIds:[...], requiredCandidateIds:[...], allowedKinds:[...], maxCandidates:3}`. matched 정상은 required≥1; unknown/unsupported는 후보0. 혼합 허용을 남용하지 않고 status를 가능하면1개로 고정한다. merchant/policy는 `{fields:{...}}`이며 현재 브라우저 안전 API 계약의 핵심 action/scope/selection/productIds/budgetWon 또는 action/enabled/productIds/budgetWon과 복원/policyDraft를 빠짐없이 기대한다. 자유 텍스트 message는 완전문자열 정답으로 고정하지 않는다.
- semanticChecks는 독립 평가자가 실제 응답의 질문/설명/금지주장/unknown·최종행동을 판단할 구체적인 한국어 체크 배열. 기계 필드 일치만으로 의미/거래/UI PASS를 선언하지 않는다. rationale과 semanticChecks는 앱 prompt에 전달하지 않는다.

고객 public240(dev180/validation60)+private60, 경영주 public96(dev72/validation24)+private24를 목표로 한다. 의미상 family 분리가 우선이며 정확 비율보다 중요하다. 쉬운 정규명만 바꾼 반복으로 채우지 않는다. 사례마다 카탈로그 실재/조건/모의 상태를 확인한다. 단순 부족/미완료는 정확히 반환하며 수를 꾸미지 않는다.

private summary는 `{version,evalVersion,role,sha256,caseCount,counts,accessLog,limitations}`이며 원문/정답/역추론 가능한 개별case trace/group은 공개하지 않는다. 담당 evaluator의 agentID·시각·행동만 accessLog에 남긴다. main은 private 파일을 읽지 않는다. 공개 집계는 보호 원문 검증을 대체하지 않는다.

### revision2: 독립 도구 반례 반영, 출시 기준 변경 없음

Darwin의 [독립 검토](../reviews/eval-01-tooling.md) F1~F6에 따라 모델 실행 전에 자료 revision을 올렸다. 고객 최종 oracle은 clear/correction→matched, unknown→unknown, refusal→unsupported, 해결되지 않은 ambiguous→clarify 또는 unknown을 따른다. 세 번째 step에는 clarify를 둘 수 없다. 기존 연구 문서의 실제 RC ID와 CORE 원장 ID를 검사하며 새로운 scenarioId의 별도 장면 정의·의미상 연결은 후속 독립 자료 검토에 남긴다.

context는 서비스별로 정의된 필드만 허용하고 text/id/generation을 넣을 수 없다. 중복 대조는 SKU 집합만 정렬하며 변경 이력·대화의 순서를 보존한다. 발화 정규화는 NFKC/소문자/공백만 적용하고 소수점·부호·문장부호를 삭제하지 않는다. 의미상 near-duplicate는 독립 검토가 필요하다.

경영주에서 둘 이상의 동등한 안전 행동이 실제 허용되면 기존 `expect.fields`와 선택적 `expect.alternatives:[완전한fields객체,...]`로 정확한 대안을 열거한다. 모든 tuple의 전체 필드와 API 정규화를 확인하며, 부분필드·빈/중복 대안·필드별 임의 조합은 금지한다. 채점기는 명시한 완전 tuple 중 하나와 일치할 때만 기계 성공으로 계산하고 semanticChecks는 모든 대안에 적용한다. 출시 문턱/표본/비용/후보 한도는 ADR002 그대로다. 최초 v1 결과는 도구의 결함 발견 이력이지 유효한 corpus 승인이나 성능 baseline이 아니다.

## 실행·완료 구분

main은 stdlib 기반 형식/FK·같은family split 누수·문장 중복·수치 coverage 검사와 실패 반례를 구현한다. 실제 Responses 호출/HTTP 종단·semantic 채점·UI 지연·DB 거래·최종holdout 실행은 후속이며 offline 검사 성공과 구분한다. customer/merchant 첫 인계는 10분 내 현재 실제 산출물·hash·수량·남은 범위이며 완료 숫자를 맞추기 위한 자동 반복 생성은 금지한다. 데이터 정확성 반례는 결과를 보기 전 수정하고 버전을 갱신한다. 커밋은 보호 자료/키/사용자.idea를 제외한다.
