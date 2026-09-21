# ADR-002 실행 환경·자료·평가 기준선

- status: adopted (revision2, 2026-09-22); 실행 검증 전
- authority: user-delegated
- policy_key: execution.evaluation.v1
- effective_scope: codex/ui-preview-20260921의 후속 최종 goal 검증/실행 계약; 중간 Preview 선행조건 아님
- proposer: coordinator
- context: VERIFY-01 revision1, UI11 `e2450fd` 이후 최종 goal 검증 준비; 2026-09-22 보완안 revision2
- depends_on: D-20~30, D-35~46, ADR-001/003/004/005/006
- supersedes/conflicts_with: 없음. D-40 미채택 제안·사용자 불변식 유지.
- applies_to: CORE-01~26, AC-21~32, R-28~43, WP-P03/P04/D01/D02/N01~03/Q01/Q02
- independent_reviews: [제품/eval 1·2차](../reviews/verify-01-product.md) Ptolemy, [방법/상태 1·2차](../reviews/verify-01-method.md) Planck; 두 agent의 revision2 채택 권고 후 coordinator 채택
- reviewed_revision2_hash: 1f57a93515ebc0893ab9c14eb473d884116093901e97fcd7b491398bac2b0c16 (채택 메타데이터 변경 전 동일 정책 본문)

## 문제와 대안

두 역할·한 탭 SQLite schema3·262상품/8점포/524조건·서버 OpenAI를 사용하는 Preview가 있고 일부 실제 정상 거래·모델·복원이 관측됐다. 아직 고정 평가 baseline/보호 holdout·전체 독립 QA·실행 가능한 CI gate·최종 G5/G6는 없다. 배포/개별 smoke 성공을 최종 품질로 확대하지 않도록 기준을 고정한다. D-46에 따라 본 ADR/PLAN-READY는 중간 화면 Preview 게시의 선행조건이 아니며 최종 goal 품질 판정에 적용한다. 모델 응답을 본 뒤 표본/합격선을 줄이는 대안은 기각한다.

## 채택 정책

1. runtime은 설치된 Node 24.12.0과 Vercel 24.x를 사용하고 `.nvmrc`/engines/CI를 맞춘다. lockfile 한 작성자, 결정적 `npm ci`. 현재 Next.js 기반을 재사용하되 실제 취약점은 원인/영향을 검토 후 호환 패치한다.
2. 고객 300개·경영주 120개 이상의 서로 다른 합성 발화/대화 사례를 유지한다. 연구→시나리오→case를 연결하고 60/20/20 목표로 **family** 단위 분할한다. 크기 반올림 때문에 비율이 조금 달라도 각 핵심 범주가 validation/holdout에 최소 3개 family를 갖도록 평가자가 확인한다. 같은 의도/상품/상태의 번역·오타·말투 변형은 동일 split이다.
3. 최소 각 역할 7개 위험 범주를 21번에서 도출한다. 검색 200+ SKU의 정확 ID/정규명 결정적 검사는 별도다. 300개를 정규명 반복으로 채우지 않는다. 각 역할 validation/holdout의 최소 절반은 정상 완료 가능 사례이며 정상에도 오타/문맥/조건 위험 tag를 부여할 수 있다. 나머지는 모호 확인·실제 미식별·제약 밖 거절·실패 복구를 사전 배정한다. 정정 후 명확해진 대화는 정상 완료도 필수다. 공개 화면/연구 예시·기존 smoke와 그 family는 dev만 사용한다. family는 동일 필요·의도·상품/상태에서 파생한 모든 변형이다. holdout 원문/정답/역추론 가능한 case별 trace는 독립 nl-evaluator만 접근하는 Git 무시 private 산출물에 보관한다. 앱/정적자산/프롬프트에 넣지 않으며 공개에는 hash·집계·접근 기록만 남긴다. 실패 원문을 튜닝에 노출하면 그 family를 regression으로 옮기고 새 독립 holdout·추가 실행 예산을 준비한다.
4. 출시 최소: 거래 불변식 위반 0건; 존재하지 않는 SKU를 유효 후보로 수락 0건; 명확 고객 요청의 올바른 후보/선택 유도 및 명확 경영주 핵심 intent/scope/전체 조건 완전 일치 각각 ≥95%; 모호/미식별/정정/거절의 **각 적용 slice** 허용 행동 ≥90%; 위험 범주별 ≥85%. 역할·split·slice별 분모/최소 사례 수·3개 이상 독립 family와 ceil(문턱×분모)를 실행 전에 고정한다. validation과 final holdout 모두 적용하며 빈 필수 slice·미실행은 PASS가 아니다. 정상과 기대 거절 성적을 분리하고 서로 상쇄하지 않는다. 중첩 tag별 성적은 별도 보고하되 전체 고유 case를 중복 합산하지 않는다.
   case oracle에는 허용 SKU 집합·명시 필수/제외 속성·확인/정정 후 목표·금지 주장/상태변화를 고정한다. 후보 k를 사전 제한하며 Recall@k와 올바른 선택 유도를 분리한다. 정답이 후보에 들어 있다는 사실만으로 성공하지 않는다. 대체품은 원상품 식별 정답이 아니며 별도 표시·새 조건 확인/동의·원래 흐름 복귀를 검사한다. 규격/조건 unknown을 채워 만들지 않는다. 경영주는 intent+이번만/지속 scope+조건 및 최종 상태까지 채점한다. 모델 원시 오류와 서비스 차단은 각각 집계하고 차단을 정상 성공으로 세지 않는다. 동의/수량/예산/48시간·정상 자동발주/요청→픽업 등 mandatory 결정적·브라우저 AC는 통계적 허용 오차로 면제하지 않는다.
5. 출시 문턱의 E2E 분모는 역할·split·slice별 사전 고정 전체 case ID다. transport/timeout/스키마 실패는 정상 성공이 아니며 미실행은 incomplete다. 응답이 도착한 해석 정확도는 별도 진단으로 보고하고 malformed/refusal도 이 분모에서 제거하지 않는다. 기대 거절 사례만 올바른 거절을 성공으로 센다. API 장애는 상품 미등록/품절/미충족 니즈가 아니다. 한 대화는 여러 turn이어도1case이며 필수 단계·최종 행동·금지 행동을 함께 판정한다. 첫 실패/최종 결과/실제 호출·usage를 보존하고 반복을 새 고유 case로 세지 않는다.
   현재 입력 turn당 provider1회·SDK maxRetries0을 유지한다. 자동 retry를 추가하지 않는다. 후속 별도 후보로 채택한다면 network/일시rate만 최대1회, 같은case의 추가attempt를 예산에 포함하며 quota/auth/permission은 즉시 중단한다. 내부 모델의 생각/원문 오류/키는 로그에 넣지 않는다.
6. 각 역할 live validation/holdout의 UI 종단 P95≤30초를 출시 최소로 사전 고정한다. 현 타이머는 JSON 수신5초·SDK30초·route maxDuration40초·브라우저45초이며 같은 timeout이 아니다. 완료/실패/중단까지 실제 elapsed를 전체 시도에 기록하고, 성공만의 조건부 latency와 전체 timeout/실패도 별도 보고한다. 미완료 측정을 빠른 성공으로 넣지 않는다. provider/서버/UI 관측 시작·끝을 구별한다. 동시성≤2이고 rate pacing은 실제 제한에 맞춰 고정한다. 실패 후 타이머/합격선을 늘리지 않는다.
7. 개선 목표: 같은 validation 전체 고유case의 E2E 성공을 주 지표로 오류≥2건 감소 또는 정확도+2%p, 필수 오류0·각 slice/범주 기준 유지·새 정상 실패0·P95 악화≤20%. paired 차이와 분모를 고정하며 1~2건은 유한 표본 개선이지 통계적 우월성이 아니다. 개선 문턱과의 거리가 오류1건 또는1%p 이내인 후보만 경계선으로 사전 정의하고 최대1회 추가 비교한다. 이때 baseline/candidate 모두 동일 사례·횟수로 추가 실행하고 모든 반복의 paired 평균으로 개선을 판정한다. 필수 최소는 각 유효 실행에서 충족해야 하며 좋은 실행만 고르지 않는다. 추가 비교량도 실행 전 예산에 포함한다.
8. 최대 후보 고객6/경영주6/전체12, 역할별 연속 비개선3회면 추가 최적화를 종료한다. mandatory 복구는 한도/비용 리셋이 아니다. baseline(dev+validation만)→빠른dev 선별→validation→선정best의 독립holdout 순서다. 사전 선언한 변경 요인 외 model/config/split/채점/반복수를 같게 한다. 모델 변경도 후보 한도를 소비한다. 최선 버전도 필수 최소 미달이면 최종 완료 불가다.
9. 총 고객300/경영주120은 split 전체 **고유 사례 수**이지 baseline 호출 수가 아니다. 정확60/20/20 예시는 baseline336사례/최종holdout84사례이며 고객3turn 최대시 retry0의 provider attempts는 각각816/204다. 실제 family 반올림·case별 예정 turn·반복수·허용 attempts의 합을 manifest에 고정한다. 기존 공개 smoke는 dev이며 고정 baseline/holdout을 대체하지 않는다. 과거 최초preflight4/smoke24 계획은 이미 진행한 UI 단계 호출 이력과 분리하며 새 한도를 자동 부여하지 않는다.
   평가 실행 전 baseline·후보dev/validation·경계 재비교·holdout·G5/G6 예비량을 포함한 수치 attempt/token/비용 상한과 권한 근거를 고정하고 실제 실행기가 중단시킨다. 잔액/rate/총 허용비용은 현재unknown이며 대규모 무제한 호출 승인이 아니다. 확인 가능한 계정 한도와 대조하고 불명확한 비용 경계는 사용자에게 확인한다. 구매/자동충전/한도상향/보호우회는 하지 않는다. attempted/response_received/parsed/usage_known/usage_unknown을 별도 집계하며 실패/timeout의 unknown usage를0으로 바꾸지 않는다. 서버리스 메모리 rate limit을 총비용 hard stop이라 부르지 않는다. quota 시 선택 실험부터 멈추되 필수 미실행을 fixture로 대체하지 않는다. 후보마다 전체420개를 반복하지 않는다.
10. 데이터는200+ 독립SKU·20~30 최근 관심/신상품 후보의 근거 상태·8~12 실제 점포/좌표·합성 고객약20명·점포별 합성 경영주1명을 유지한다. availability는 결정적20~35% 희소 분포, 정상 상품은 복수점포/희소 후보1~3점포, 거래 값은 simulated. 채택된 최신 research/catalog/scenario/eval manifest와 source hash를 연결한다. 현재 DATA02의262/524 배포는 전체 상품 사실/좌표 출처·재사용조건 QA 완료가 아니다. RS-20260921과 goal-20260922 근거를 역할별 독립 검토하고 좌표를 임의 합성해 verified로 표시하지 않는다.
11. 실제 고객390/360px·경영주1280px 브라우저 QA, 고객과 경영주 QA는 서로/구현자와 다른agent다. 고객 후보 확인→요청 완료 필수 제출/확인≤4회, 명확 정규명의 불필요 질문0·실제 모호 사례 추가질문≤2. 경영주10품목 동일묶음 승인1회·승인된 정상 자동발주 건별승인0·반복조회로 발주/알림 증가0. 고객 상세 접근/상태 정합성 AC32는 별도 필수다.
   비교 전 동일seed/업무량/입력난이도/시작·종료 상태·표본/반복수의 재현 가능한control을 고정한다. 고객 입력시작→저장완료와 경영주10품목의 전체 필수 조작(텍스트/점포/동의 포함)·화면 이동·질문/승인·P50/P95를 센다. 상세 열람도 이동/시간에 포함한다. 후보는 전체 필수 조작/이동/불필요질문 증가0·완료P95 악화≤20%이며 모든 성공/실패/도구·네트워크 대기를 함께 보고한다. 기존 성능이 없으면 사전 고정control과 절대 흐름 기준을 측정하며 과거값을 만들지 않는다. 브라우저agent 측정은 인간 사용성 연구가 아니다. 동의/예외 확인을 삭제해 숫자를 맞추지 않는다.
12. 현재 gate runner/제품CI 강제는 미구현이며 Vercel status와 구분한다. 구현 acceptance: phase별 실제 명령/count/exit/skip/child 결과·코드/계약/seed/prompt/model/eval fingerprint·별도 구현자/검토자·정상/실패 목적 보존을 읽고 누락/0개/필수skip/stale/자기검증/자식FAIL/fixture-as-live/위조passed:true를 반례로 거절한다. 기존 검사들을 잇는 최소 실행기와 항상 결과를 내는 CI aggregate `gate`를 만들고 허용된 권한으로 PR+check 강제를 연결한다. 새 관리자/중복프레임워크는 만들지 않는다. 로컬 결과의 무서명 한계를 명시한다. 현재 Production 모델 경로 비활성은 별도 안전 경계이며 Preview 성공을 이유로 해제하지 않는다. 보호된 접근·호출 제한을 준비하고 G5→정확 mergeSHA→실제G6로 검증한다.

## 검증과 효력 확대

두 독립 검토의1차 반례를 revision2에 반영하고 같은 hash에 대해 두 보완 ACK를 받았다. 초안+보완 총2회로 정책 검토를 마쳤으며 새 중대 반례 없는 반복 토론을 추가하지 않는다. 21/23번은 본 ADR을 기준으로 연결한다. 구체 평가manifest·실행예산/작업계약은 후속 구현 산출물이며 실행 전에 고정한다. 결과를 보고 기준을 바꾸지 않는다. 본 ADR 채택은 실행 PASS/계정 비용 승인/Production 준비 완료가 아니다. PLAN-READY와 전체 검증은 중간 Preview 게시를 막지 않으며 최종 제품 게이트는 유지한다.
