# EVAL-02 독립 자료 감사·응답 대조기 · revision1

2026-09-22 KST. base `74d28283691e06619687bf285b597d65de1efb14`, EVAL01-v2 공개/보호 초안의 후속이다. D-46의 화면/작은 Preview를 유지한다. 이 작업은 모델 baseline·전체 G1~G6 또는 출시 승인 단계가 아니다. provider 호출0, 보호 원문을 main/앱 구현자에게 노출하지 않는다.

## 목적과 소비 기준

고객이 정상 상품을 찾고 모호함을 확인하며, 경영주가 이번 묶음과 지속 정책을 올바르게 구분하는지 정직하게 측정할 기반을 만든다. card·CORE03/05/11/21/22/23/25/26, D44/45/46, ADR002 revision2, docs09/13/14/20/21/23/24/25, EVAL01 revision2를 따른다. 제품 동의/예산/48시간·앱/프롬프트/seed·출시 기준은 변경하지 않는다.

입력 hash: EVAL01 context `c9ad2d925058cf7b01f7c1d0359095316b36eeb9d656030ea33245e7cf766cf0`; customer public `2ca5ae5e268f6d9e013339375c6f61f71992fcc1bdb762f1de5b85b9b927ed41`; merchant public `099fb87f983536d87097d0e4d8a85be32b6c910243d38bc71a0eecab63bf8286`; dataset validator `9c62ee23198c633cda05c6366b22fa209e092c08c2698987c19daa64cc1fb98d`. 보호 hash는 각 공개 summary와 평가자 실제 파일 대조로 확인한다. 앱 catalog/계약은 EVAL01에서 변하지 않았다.

## 소유권·병렬 작업

- main: `scripts/eval-response.mjs`, `scripts/eval-response.check.mjs`, 공통 package/quality/README/작업 기록. 기존 API 응답 파서와 전체 정답 tuple을 재사용하는 순수 응답 대조기를 구현한다. 실제 HTTP 실행/전체 분모 집계·사용량 예산·semantic 판정은 후속이며 이 모듈 단독 PASS를 모델 성공으로 바꾸지 않는다.
- 독립 customer-data reviewer: `docs/reviews/eval-02-customer.md`, 필요하면 Git 무시 `artifacts/private/evals/customer-review.md`만 수정. 공개240+보호60·공개 예시/연구/카탈로그에서 의미상 family 분리·라벨·위험 tag·최소 coverage·연구→장면 추적을 직접 검사한다. 기존 curator/앱 구현자가 아닌 별도 평가자다.
- 독립 merchant-data reviewer: 위 customer 대신 merchant 두 보고서만 소유. 공개96+보호24를 같은 원칙으로 검사한다. 고객 reviewer와도 분리한다.
- 순수 대조기 독립 reviewer: 구현 뒤 새 에이전트에 좁은 소유권과 대상 hash를 전달한다. 자기 테스트를 독립 판정으로 세지 않는다.

자료 reviewer는 원자료/앱/정답을 고치지 않는다. 공개 사례의 구체적 반례는 공개 보고서에, 보호 원문의 ID/발화/정답/역추론 가능한 비교는 private 보고서에만 남긴다. main으로 반환하는 것은 집계·심각도·현재 hash·수정 방향·private 보고서 경로뿐이다. private 상세는 해당 원래 curator에게 직접 전달하고 공개 요약에 복사하지 않는다. 접근자 ID/시각·hash·범위를 보고서에 남긴다. 도구 출력/오류에도 보호 원문을 넣지 않는다.

## 이번 완료 조건·다음 행동

자료 감사의 첫 인계는12분 이내 actual reviewed 범위/반례·남은 범위를 반환한다. 420개 모두 읽지 않았으면 전수 승인하지 않는다. 이미 알려진 family 비율(69/33/30, 48/24/24)과 별도 장면 미정의는 실제 의미상 누수/정답 문제와 구분한다. ratio만 맞추려고 같은 의미 family를 쪼개지 않는다. 공개 smoke family의 dev 전용과 각 split 정상 최소 절반·val/hold 각 slice/risk3family를 유지한다. 수정은 원래 curator에게 재배정 후 별도 revision과 독립 재검증이다.

대조기는 허용 status/SKU/kind·정답 recall 진단과 전체 tuple 대안을 구분하고, API가 거절하거나 안전 정규화한 응답을 원래 모델 정답으로 세지 않는다. 서비스별 실제 request/response, customer 후속 질문·정정의 동일 대화, 상관 ID/generation/점포/정책 버전을 확인한다. 원문 오류/키·내부 추론은 출력하지 않는다. semanticChecks는 별도 독립 평가 전 pending이며 거래/브라우저/latency/비용/출시 PASS를 반환하지 않는다. 정상·오답·malformed·교차 request·부분 tuple 조합·대체 후보/정확 식별 혼동 반례를 실행한다.

최종 기록은 docs/PROGRESS·WORKPLAN과 작은 commit/push·실제 CI/Ready에 연결한다. 앱 화면을 이 준비 작업 때문에 되돌리거나 막지 않는다.
