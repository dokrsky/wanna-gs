# 자연어 평가 자료

EVAL-01-20260922-v2는 현재 앱의 고객 검색과 경영주 묶음/지속 정책을 평가할 **합성 자료 준비 단계**다. 기준은 [ADR002 revision2](../docs/decisions/ADR-002-execution-and-evaluation.md), 자료 형식·소유권은 [EVAL01 계약](../docs/context/EVAL-01.md)이다. 모델 baseline·성능 측정·채택 후보·제품 출시 판정은 아직 없다.

## 구분과 명령

Node24.12.0에서 실행한다. 이 명령은 네트워크와 모델 API를 호출하지 않는다.

```sh
npm run check:eval-tools
node scripts/eval-dataset.mjs customer
node scripts/eval-dataset.mjs merchant
```

첫 명령은 **검사기 자체의 인위적 반례**다. 뒤 두 명령은 각 공개 pack의 실제 형식·기존 API 요청/정답 정규화·상품 ID·동일 group의 split 충돌·정규화된 중복 대화/상태·선언된 범주별 분모를 검사한다. 실행 전 고정된 ceil(비율×분모)를 출력하며 실제 성공률을 만들어내지 않는다. coverage 부족은 종료2, 형식 오류는 종료1이다.

실제 연구 원장에 있는 RC 식별자와 CORE 식별자도 대조한다. 새로운 scenarioId의 장면 정의·연구에서의 의미상 파생은 별도 자료 검토가 필요하며, ID 형식 검사만으로 참조가 완성됐다고 하지 않는다.

`customer.json`, `merchant.json`은 dev/validation 전용이다. 공개 화면 예시·기존 smoke 및 같은 의미 family는 dev에만 둔다. 상품 카탈로그는 공개 입력이지만 평가 정답·rationale·semanticChecks를 앱/프롬프트/별칭에 import하지 않는다. 문자 정규화는 단순 중복 탐지만 하므로 의미상 유사 family의 분리·tag 적합성·정답 사실은 별도의 평가자가 검토해야 한다. 이 검사는 구조적 누수를 찾는 도구이지 의미상 누수 부재 인증이 아니다.

## 보호 holdout

각 담당 평가자가 Git 무시 `artifacts/private/evals/`에서 holdout을 큐레이션·보관한다. 공개에는 role별 hash/수량/범주 집계/접근 이력만 남기며 내용·정답·역추론 가능한 case별 trace는 올리지 않는다. 구현자·프롬프트 실험자는 private 파일을 읽지 않는다. 공개 CLI는 고정 공개 경로만 받으며 private 실행은 평가자 전용이다.

평가자는 `inspectFiles([공개pack, privatepack], ["dev", "validation", "holdout"])`를 메모리에서 호출해 전체 ID/group/중복·coverage를 대조할 수 있다. 출력은 집계만 사용하고 JSON parse 실패에도 원문을 로그에 넣지 않는다. public summary가 있다는 이유만으로 holdout integrity·의미·성능을 PASS로 세지 않는다. 담당자의 실제 실행·hash·독립성/접근 기록과 최종 holdout 결과를 따로 확인한다.

## 다음 실제 실행 조건

- 현재 사례 수는 고객300·경영주120이며 공개336/보호84로 작성됐다. 하지만 family 배분은 고객69/33/30, 경영주48/24/24로 60/20/20 목표와 차이가 있다. 별도 scenario 기록·라벨/의미 검토·family 재배분은 미완료이며 baseline-ready가 아니다. 공개 CI의 minimum coverage 통과로 이 잔여 조건을 대체하지 않는다.
- 전체 seed 사실/출처와 양쪽 자료의 정답·family를 독립 검토하고 관련 hash를 고정한다.
- 비용 권한·수치 attempt/token/비용 상한·예비량을 확인하고 실제 실행기에 중단을 구현한다. `.env.local` 존재만으로 대규모 호출을 승인하지 않는다.
- dev+validation baseline부터 실제 앱 경로로 실행한다. 명령/환경/모델/prompt/seed/eval SHA, case/turn/attempt, 성공/오류/미실행, unknown usage를 구분한다.
- 기계 필드 일치에 더해 독립 평가자가 `semanticChecks`의 의미·질문·금지 주장·최종 행동을 판정한다. 후보만 포함된 Recall을 올바른 선택 유도 성공으로 바꾸지 않는다.
- API 검사와 실제 UI 종단 시간·SQLite 거래·동의·48시간·두 역할 브라우저 QA는 별개다. best 선정 후에만 보호 holdout을 실행한다. 노출 후 튜닝 시 해당 family를 regression으로 옮기고 새 독립 holdout을 준비한다.

검사기 반례, 준비된 case 수, 향후 예정 호출 수를 실사용 모델 성능이나 출시 게이트로 표시하지 않는다.
