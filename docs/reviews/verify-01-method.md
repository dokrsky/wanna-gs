# VERIFY-01 방법·상태/실행 독립 검토

2026-09-22 KST · 첫 검토 · 결론: **ADR-002 보완 필요, proposed 유지**. 방법 감사는 제품 PASS가 아니며 UI11 구현·Preview 게시의 대기 조건이 아니다. 다른 product reviewer 보고서는 읽지 않고 아래 결론을 작성했다.

## 실제 ACK·범위

- 역할: coordinator와 별도인 단일 method-auditor 겸 ADR 상태/실행 검토자. 관리 깊이 추가·하위 에이전트 생성 없음. 실제 모델 선택 override 없이 상속 환경에서 검토했으며 모델명을 추정하지 않는다.
- 읽은 계약: VERIFY-01 revision1, card/CORE/index/GOAL/원장, ADR-002, 14/16/17/20/21/22/23/25, UI-11 소유권 계약, 현재 PROGRESS의 포인터와 DATA02 증거, 관련 코드·package/scripts. 요구된 orchestration-audit/decide와 최소 코드 검토를 위한 ponytail을 적용했다.
- 소유 파일은 이 보고서 하나. ADR/index/PROGRESS/앱/공유 설정은 main 소유로 유지한다. 앱 서버 실행/build/browser/live/network/배포/외부 권한 검사는 수행하지 않았다. 아래 명시한 offline 진단만 실행했다. `.env.local` 및 프로세스 환경변수 값은 읽거나 출력하지 않았다. 다른 검토 보고서와 보호 holdout 원문/정답도 열지 않았다.
- 작업 시작 2026-09-21 16:21:34 UTC. base `25e1e9d71583655679a3fb3dd91ad2cf79accecd`와 branch는 받은 manifest 기준이다. 현재 검토는 아래 파일 content hash 기준이며 원격 SHA를 새로 확인한 것이 아니다.
- 범위 이탈 기록: 최초 상태 확인 묶음에서 읽기 전용 `git status --short`를 한 번 실행했다. 이번 지시의 Git 금지에 맞지 않았으며 이후 Git 명령은 사용하지 않았다. Git 쓰기·commit·push·설정 변경은 없다.

실제 읽은 파일의 SHA-256 ACK:

```text
VERIFY-01 rev1 e5a0e42b907fe74a9b980610f7417438a8f5be1738ef7e7184f127080ed75b59
card          62fae686c1967902ac443a0a315f4c7f59f76df9e6de3a3568e4355d6e334e03
CORE          65c7541d3549bf49b715da687aa5af060fce9a48e774a4130d9ac350349d8114
index         46dd67f944c81b7e92251f856da6a027e251748639f377b9a0bc811e8804d700
GOAL          b163a114640e3ae98f913892db78e004e148986ab07522582457ca8112679042
ADR-002       b8a4d18d09268c58e0c4ab0ec491fef811b2cf144d8e35bb854f226406644110
method skill  53873938e6eea892a38744e3d902ed154f530b2d32ce246d1561b1d04c1b30d7
decide skill  fd76844367789fdfa43bd9bf2212d649f2d0407f4efb55797ad6134c75f46441
17            21928f872edbf9632eb86334f06102c86bc07417ddbea095152d328c00ebf79e
20            73706b34d40155b35190a32ce6b69eabd3da0ad519fb18f95e7464eb38d2e238
22            da6ee6262924c673ed6b9305f8dced9ec1b58610073313cffa9a77e87e27d46e
14            eb15ed27e5d30d8dbb7f3491d6317cd199f46d7e27e9ea34c2d162a2d768acd2
16            138b78024d1c7fec378cebe24f86047a8337ee251bad8c247ff8683a6193732a
23            24d23005dde477399470906e3e20259f64a51ad4a5700def8a6625affe19261c
25            c530d9ebaed158bf700ca36a0b22d4d275e0ac2ac3c016a3580d4eb8f1642ea6
```

## Findings와 최소 수정

### M1 — P1: 420회 baseline은 holdout 순서 및 실제 turn 수와 일치하지 않는다

ADR §2/3/8은 family 분할·보호 holdout·best 선정 뒤 최종 평가인데 §9는 baseline 420회다. 정확한 60/20/20 예시라면 고객 dev180/validation60/holdout60, 경영주72/24/24다. baseline에서 420사례를 모두 실행·실패 분석하면 holdout84사례를 이미 사용하게 된다. 반대로 holdout을 제외하고 420을 단순 호출 예산이라고 쓰면 어떤 사례/반복을 뜻하는지 재현할 수 없다.

더구나 `dialogueLimits.turns=2`와 `searchDialogue`는 최초 입력+답변2회의 각 제출마다 provider를 한 번 부른다. **사례1개 ≠ 호출1회**다. 정확 split을 가정한 상한 산술은 baseline dev+validation **336사례**, 모든 고객 대화가 3turn일 때 **816 provider attempts**; 최종 holdout84사례는 **204 attempts**다. 전체420사례를 한 번씩 평가해도 최대1,020회다. 실제 분할·분기별 turn 수를 고정한 평가 manifest로 다시 산정해야 하며 이 수치는 실행 권한/권장 호출량이 아니다.

최소 수정: §9의 고정 `baseline 420회`를 제거하고 `sum(case별 예정 turn × 사전 반복수 × 허용 attempt수)`로 고정한다. baseline은 dev/validation만, 후보는 고정 dev 선별+같은 validation, 최종 선정본만 독립 holdout을 쓴다. 공개 예시/그 family는 dev만 유지한다. final holdout 실패 후 노출 사례로 수정하면 regression으로 옮기고 독립 새 holdout·추가 예산을 별도로 확보한다. 같은 세트를 재실행해 새 holdout이라고 부르지 않는다.

### M2 — P1: 호출·비용 상한은 현재 실행 가능한 제동 장치가 아니다

실제 공통 SDK는 `maxRetries:0`, `timeout:30000`, `max_output_tokens:1200`, `store:false`, `logLevel:off`다(`lib/assistant/server.ts:123`). 앱/스크립트에 평가 전체 attempt/token 예산 집행기는 없다. `IpLimiter`의20/IP/분은 한 프로세스 한정이며 재시작/서버리스 인스턴스에 걸친 지출 상한이 아니다. 동시성2도 충분한 제한이 아니다. 예를 들어 2초 응답이면 한 분 안에20회를 넘는다.

`parseStructuredResponse`는 refusal/incomplete/malformed에서 usage를 반환하기 전에 throw하고, `failureResponse`는 안전한 오류 code/message만 보낸다. 따라서 성공 응답 usage만 합치면 실패·timeout·중단 후 사용량을 0으로 오계상할 수 있다. 정적 키 설정/과거 단일 성공은 잔액·예산 승인 증거가 아니다. `.gitignore`의 private 제외도 비용 경계가 아니다.

최소 수정: 평가 시작 전에 역할·split·case/turn/반복·후보·재비교1회·실패 attempts·G5/G6 예비량을 포함한 **수치 상한과 권한 근거**를 명시한다. SDK retry0을 현재 기준선으로 유지하고 자동 retry를 새로 추가하지 않는 것이 최소안이다. 나중에 retry1을 채택하면 동일 case의 attempt2도 예산에 포함하고 network/rate만 허용, quota/auth/permission은 즉시 중단한다. 상태별 `attempted / response_received / parsed / usage_known / usage_unknown`을 집계하고 unknown 비용을 0으로 바꾸지 않는다. 알려진 토큰 비용 추정과 계정 잔액/실제 청구를 구분한다.

현재 계정 잔액·rate limit·관리 권한·허용 총 비용은 **unknown**, 대규모 평가 호출은 사전 무제한 승인되지 않았다. 한도 확인이 불가능하면 허용 근거가 있는 제한된 묶음까지만 계획하고 확인이 필요한 비용 경계를 main이 명시해야 한다. 구매·자동충전·한도 상향·보호 우회는 제안하지 않는다. quota 발생 시 선택 실험부터 멈추되 필수 live를 fixture로 대체하지 않는다.

### M3 — P2: timeout·지연·실패 분모를 실행 층별로 구분해야 한다

현재 JSON 수신5초 → SDK30초 → route `maxDuration=40` → 브라우저45초다. `45초 timeout` 하나만 ADR에 쓰면 35초 provider 응답을 정상 기대하는 반례가 생긴다. 실제 코드는 30초에 SDK timeout을 낸다. §5의 “최대1회 재시도”는 0회를 허용하는 상한으로 볼 수 있으므로 재시도 구현이 반드시 빠졌다고 단정하지 않는다. 다만 **계획 상한과 실제 retry0을 명시**해야 재현 가능하다.

최소 수정: 한 turn의 UI 종단/서버/provider 관측 시작·끝을 구별하고 현재 5/30/40/45초를 기록한다. P95≤30초 목표는 유지하되 성공 응답만 뽑은 P95와 전체 실패/timeout을 함께 보고한다. 실패를 제외한 조건부 해석 정확도가 end-to-end 출시 문턱을 대신하지 못하게 한다. 지연/성공 판정에 적용할 분모, 중단·timeout 관측값 처리, 반복수를 실행 전에 고정한다. 앱 동작을 문구에 맞춰 무조건45초로 늘리는 수정은 불필요하다.

### M4 — P1(릴리스 전): runner/CI·Production 경로는 아직 없음 또는 비활성이다

로컬 확인: Node24.12.0 실행 가능, package/lockfile engines24.x, 잠긴 Next15.5.25/OpenAI7.20.0. `.nvmrc`, `.github/workflows`, `quality/gates.json`은 없다. package에는 개별 offline/SQL check와 build가 있지만 전체 `gate`/eval 명령은 없다. `lib/assistant/check.mjs`, `scripts/check-data02.mjs`처럼 package script 밖 검사도 있어 `npm run` 일부 성공을 전체 집합으로 취급하면 누락된다. `lint`는 실제 Next15 CLI에 존재하지만 ESLint 설정/직접 의존성이 없어 CI에서 무인 실행 가능한지 별도 확인이 필요하다. 여기서는 lint를 실행하거나 설정하지 않았다.

`environmentEnabled`는 `VERCEL_ENV=production`이면 항상 false다. 현재 Preview opt-in은 플랫폼 보호가 있다는 운영자의 선언을 신뢰할 뿐 보호 자체를 조회하지 않는다. Preview 성공만으로 그대로 main 배포해도 G6 live는 성공하지 않는다. 이것은 현재 안전 경계이지 본 감사에서 해제할 대상이 아니다.

최소 수정: §12를 현재 “강제 미구현”과 구현 후 acceptance로 분리한다. main이 기존 명령을 연결하는 최소 phase runner/항상 결과를 내는 aggregate `gate`를 만들되 별도 관리자/중복 프레임워크는 만들지 않는다. 정확한 코드·계약·seed·model/prompt/eval fingerprint와 독립 검토자 ID, 실제 count/exit/skip/child 상태를 검사하고 stale·0개·누락·자기검증·fixture-as-live·자식FAIL·위조 passed:true를 반례로 거절해야 한다. 문서/lint/빌드 한 번 성공을 G1~G6로 확장하지 않는다.

원격 required checks/Actions 실행·권한·보호 규칙은 이 감사에서 미확인이다. 현재 Vercel status와 제품 CI를 구분한다. 보호된 최종 시연 접근·서버 호출 제약을 준비한 뒤 별도 권한/설정 작업으로 Production 경로를 검증하고 G5→exact merge SHA→G6를 유지한다. UI11 Preview는 이를 기다리지 않는다.

### M5 — P2: 실제 소비자 누락 반례 — 정책 화면만 4KiB

`app/components/policy-assistant.tsx:133`은 body가4096B를 넘으면 fetch 전에 `BODY_TOO_LARGE`를 낸다. 같은 계약의 API와 저장 기록은 DATA02에서8192B로 바뀌었다. 실제262개 ID·유효 정책·“앞으로 예산만 8만원으로 바꿔줘” payload는 **4,284B**다. domain `policy.set`도 카탈로그의 전체 대상 집합을 허용한다. API checker는 PASS여도 이 유효한 저장 정책의 화면 입력은 거절된다. 현재 점포 체크박스로262개를 실제 선택하는 브라우저 경로를 실행했다는 뜻은 아니다. 유효 상태/저장 사본을 소비하는 화면의 계약 불일치다.

최소 수정 요청(main 소유): 화면의4096을 같은 `POLICY_BODY_BYTES`로 연결하고 전송 전 정상/초과 검사를 그 실제 소비자에 추가한다. 전체 대상/300자 한글 정상,8192/8193B 경계, 기존 명시 확인·동의·정책 저장 유지. 이 보고서는 앱을 고치지 않았다. 선행 Lagrange의 API/trace 좁은 PASS를 부정하는 것이 아니라 그 검토가 포함하지 않은 UI 경계를 발견한 것이다. 최종 QA를 더 만들기보다 이 실제 소비자 누락만 닫는다.

### M6 — P2: 현재 context/소유권·종료 범위를 동기화해야 한다

ADR의 CTX-GOAL/초기 scaffold 설명, index의 ADR-002 적용 branch, PROGRESS 최상단 UI09A·242/schema2 포인터가 현재 VERIFY-01의 DATA02·262/schema3와 다르다. PROGRESS 하단에는 새 Ready 증거가 있다. 위 포인터만 읽는 재개 담당자가 이미 끝난 UI09B를 재시작하거나 오래된 source hash로 평가할 구체 위험이다. UI11은 별도 FE/main 파일 소유로 진행 중이므로 본 보고서가 이를 덮어쓰지 않는다.

최소 수정: main이 ADR의 현재 문제/범위·depends_on D46/ADR003~006·CORE26/AC32와 적용 branch/context를 갱신하고 PROGRESS 상단 포인터를 하단 최신 사실과 맞춘다. 이후 입력 manifest hash와 영향 파일 hash를 다시 ACK한다. 단순 UI CSS 변경은 NL semantic baseline을 무조건 무효화하지 않지만 해당 viewport/조작 증거는 갱신한다. 코드/seed/prompt/model/평가 기대값 변경은 영향받는 결과를 stale로 한다.

후보 상한 고객6/경영주6·전체12, 역할별 연속 비개선3, 경계선 한 번 추가 비교를 유지한다. 추가 비교에도 baseline/candidate 양쪽 호출량과 원래 실행을 남긴다. mandatory 복구는 선택 실험 한도 리셋/비용 무제한이 아니며 모든 버전 최소 기준 미달이면 완료 불가다. 초안+보완은 **총2회 검토**로 명확히 하고, 새로운 중대 반례 외 반복 토론은 종료한다. reviewer ID와 구현자 ID가 다른지 확인하며 method-auditor 한 명의 의견을 두 독립 의견 또는 최종 고객/경영주 QA로 세지 않는다.

## 실행한 읽기 전용 진단

1. Node24 `node --conditions=react-server lib/assistant/policy.check.mjs`: 종료0,262개/60·전체 대상/8192B API 경계 PASS. 검사 내 network를 금지하며 live0회. module type 경고가 있었으나 실행 실패는 아니다.
2. 별도 Node stdin 진단(파일 생성 없음): 현 catalog ID·store로 policy checker와 동일 구조의 유효 payload 생성 →4,284B. 실제 화면 소스에 `byteLength > 4096`가 있음을 assert하고4,284>4,096 및≤8,192 확인. 화면 렌더/클릭 실행은 아니다.
3. 메모리 산술: 정확60/20/20 예시에서336/84 cases,816/204 max attempts(retry0) 확인. 평가셋 생성·평가 실행·분포 승인 증거는 아니다.
4. package/lockfile/SDK/API/프런트 타이머/오류 처리/ignore 경로 읽기. 비밀값은 미열람. `server-only`·고정 provider URL·로그 off·정제 오류·status의 비밀값 비반환 구조를 확인했으나 최신 client bundle/실제 배포 키 비노출 검사를 대체하지 않는다.

핵심 검토 코드 hash:

```text
package.json                       94c780d6fadca0797fa0d717ea0b8522a484874144b2539ce7998972f3ff2755
lib/assistant/server.ts            e69be9ce2bbe2746dfe5a560808d0d50858136a3f3a347627b07d44c13cf6b6c
app/components/policy-assistant.tsx d95a18b37cd4377fec88e848c31aa7e35bec93662ebe8eb59e51c6c0bb4a93e8
```

## 한 가지 제한 운영 시험 — METHOD-VERIFY01-01

상태: **proposed / 운영 시험 미실행**. 아래 성공 조건은 시험 전에 고정한다. 본 감사자가 자기 제안을 채택/검증하지 않는다. coordinator가 제안자 외 독립 검토 후 다음 한 번의 계약 수정에만 시험할 수 있다.

- Trigger/기준선: DATA02 정책 제한 변경에서 API·trace 소비자는8192로 일치하지만 화면 소비자1곳은4096이다. 세 경계 중1개 누락. 위4,284B 반례로 확인했으며 소요 시간 절감의 과거 수치는 없다.
- 가설/단일 변경: 공유 상수 수정 handoff에 **소비자3곳(API·trace·UI)의 경로/hash/소유자와 동일 정상·경계 payload 결과를 한 줄씩** 명시한다. 새 manager/runner/정책 문서를 추가하지 않고 기존 작업 계약/검토 표만 사용한다.
- 사전 조건: main의 M5 최소 수정 후보가 있고 API/trace/UI 파일 소유를 확인한다. 독립 검토자가 이 시험 조건을 확인한다. 계약 의미·구매 동의·정책 승인·retry/출력 한도는 변경하지 않는다.
- 범위/관찰 구간: 다음 정책 body-limit 수정 후보 단1회, handoff~독립 좁은 검사까지 최대10분. 유효4,284B/300자 한글과8192·8193B 경계만 검사한다. 전체 앱 검증·live/API 호출·브라우저·새 에이전트는 시험 자체의 필수 항목이 아니다. 전체 goal QA는 별도로 남긴다.
- 사전 성공: 3/3 소비자가 같은 계약을 소비, 유효 전체 대상 손실0·초과 거절 유지, 관찰 파일 hash drift0 또는 변경 ACK 후 재검사, 실제 검증과 단순 소스 확인을 구별. UI11의 독립 게시를 기다리게 하지 않는다. 10분 내 결론/미완료 인계, 검토는 초안+보완 총2회 이하.
- 실패/부작용: 대상 잘라내기·정상 입력 거절·무조건 PASS·별도 중복 gate·무관한 UI11 중단·숨겨진 추가 모델 호출·소유권 충돌 중 하나라도 있으면 채택하지 않는다. 단순 체크리스트 채움은 성공이 아니다.
- 관찰 기록: main은 실제 변경 파일 hash/각 소비자 결과/누락 수/handback 시각을 기존 evidence에 기록하고, 제안자 외 검토자는 결과를 판정한다. 파일·문서 hash만으로 의미상 동일성을 보장하지 않는다.
- rollback: 추가 handoff 표가 효과 없거나 지연을 만들면 그 운영 요소만 폐기하고 기존 파일 소유권+좁은 독립 검토로 돌아간다. 올바른8KiB 소비자 버그 수정이나 제품 보호를 되돌리지 않는다. 앱 배포 rollback을 이 시험이 승인하지 않는다.
- 처분: 독립 승인·실제 관찰 전이므로 **제한 시험 제안**, adopted/PASS 아님. 결과가 불명확하면 unverified, 개선 없으면 기각·기록. 새 실제 누락이 없으면 추가 운영 실험을 반복하지 않는다.

## 인계

main이 M1/M2/M3/M6의 최소 ADR 보완과 두 독립 검토의 반례 처분을 맡는다. M4는 실제 GATE/최종 환경 구축 작업으로 남기고 M5는 작은 UI 소비자 수정으로 배정한다. 이 보고서의 정책 의견·오프라인 진단·후속 제안은 제품 G5/G6, full QA, 계정 예산 승인 또는 최종 데이터 검증이 아니다. UI11은 계속 게시한다.

첫 보고서 작성·형식 검사 완료: 2026-09-21 16:26:33 UTC, 시작 후4분59초. manifest/index/ADR/server/policy UI hash를 다시 읽어 위 ACK와 같음을 확인했다. 코드 블록 짝·끝 공백 검사는 보고서 형식에만 적용되며 앱 게이트가 아니다.

## 2차 ACK — ADR-002 revision2 · 2026-09-22 KST

최종 정책 검토 의견: **채택 권고(adopt recommendation)**. revision2 전체를 직접 읽고 내 1차 M1~M6와 대조했다. 새 구체적 P1/P2 반례는 발견하지 못했다. 초안+보완 총2회로 이 ADR 검토를 종결하며 추가 일반 조사나 취향 기반 재검토를 요구하지 않는다. 이 의견은 coordinator의 실제 `adopted` 기록·다른 독립 검토자의 ACK를 대신하지 않는다. 다른 product reviewer 보고서는 이번에도 열지 않았다.

읽은 대상과 실제 SHA-256:

```text
ADR-002 revision2 1f57a93515ebc0893ab9c14eb473d884116093901e97fcd7b491398bac2b0c16
VERIFY-01 rev1    e5a0e42b907fe74a9b980610f7417438a8f5be1738ef7e7184f127080ed75b59
POLICY-01 rev1    2ee8b64bf91f53808549484178493b183d71f3ca4f9d0f5ce4aafc003929d77a
index            46dd67f944c81b7e92251f856da6a027e251748639f377b9a0bc811e8804d700
card             62fae686c1967902ac443a0a315f4c7f59f76df9e6de3a3568e4355d6e334e03
CORE             65c7541d3549bf49b715da687aa5af060fce9a48e774a4130d9ac350349d8114
1차 보고서 원본   e8b6de6434663fe14932ed51bc1537fc2dc78c5893a7a14afa3f1f4ea251a1dd
```

| 1차 항목 | revision2 처분·남은 실행 책임 |
|---|---|
| M1 baseline/holdout/turn | §3/8/9가 baseline dev+validation, best 이후 보호 holdout, 사례/turn/attempt 구분과336/84·816/204 예시를 반영했다. 공개 smoke family dev 전용·노출 holdout 교체도 명시했다. 반례 해소. 실제 split/분모/turn manifest는 평가 전 실행 산출물이다. |
| M2 비용/호출/usage | §5/9가 현 SDK retry0 유지, 수치 attempt/token/비용 상한·권한 근거·실행기 stop·필수 예비량·unknown usage 비제로 처리를 고정했다. 대규모 호출의 비용 경계 확인도 명시했다. 정책 반례 해소. 잔액/rate/총 허용비용 unknown, 집행기 미구현과 실제 구매/한도 상향 금지는 그대로다. |
| M3 timeout/분모 | §5/6이 고정 전체 case E2E 분모와 응답 조건부 진단을 분리하고 malformed/refusal/timeout을 숨기지 않는다. 5/30/40/45초 층별 제한·전체 시도 elapsed·성공 조건부 지연을 구별했다. 30초 P95 목표를 낮추지 않았으며 실행 전 측정 정의를 사용한다. 반례 해소. |
| M4 CI/Production | §12가 gate/CI 미구현·Vercel status와 차이를 명시하고 stale/0개/누락/자기검증/위조 결과 거절을 구현 acceptance로 남겼다. Production 비활성은 별도 안전 경계, 보호·호출 제한 준비 후 G5→exact merge SHA→G6다. 문서로 구현을 통과시키는 모순은 해소됐고 실제 구축/원격 권한/릴리스 검증은 미완료다. |
| M5 UI 한도 | 정책 문구 채택과 별개인 POLICY-01 코드 복구로 처분. UI/API/trace의8192 공통 상수 정합과 아래 좁은 독립 실행을 확인했다. 이 결과로 ADR/CI/브라우저 품질 전체를 PASS 처리하지 않는다. |
| M6 context/종료/독립 | ADR의 현재262/schema3·UI11 이후 context·D46/ADR003~006·CORE26/AC32와 총2회 검토, 후보/반복 상한·mandatory 복구 비리셋이 보완됐다. index/PROGRESS 현재 포인터·21/23번/작업 계약 동기화는 main의 채택 반영 작업으로 남으며, 이번 검토에서 완료를 주장하지 않는다. 수정된 ADR을 초기 scaffold 기준으로 해석할 모순은 해소됐다. |

### 별도 범위: POLICY-01 코드 독립 결과

Node **24.12.0**에서 `node app/components/policy-request-ui.check.mjs`를 직접 실행해 종료0을 확인했다. checker hash `e904c6457d7c1eecf39b8d66c4004ced022e15648a020b28d8554eb768c62163`, 실제 TSX hash `7352796d674f9686be128a40e56202ab4b974c24fdacf9dda4bca4818fd8bdb6`가 인계값과 일치했다. AST는 실제 `PolicyAssistant` 안의 `propose` 전체를 추출하며, 옛 제한은 그 함수의 유일한 byte guard RHS만 메모리에서4096으로 바꾼다. 복제한 별도 입력 처리 함수가 아니다. 실제 계약 parser를 사용한다.

- RED: 현재 실제262개 ID+한글300자의5,159B 요청이 옛 guard에서 전송 전에 거절된다. GREEN: 같은 실제 callback과 입력이 수정 후 정확한 대상·OFF 유지·예산 초안으로 전달된다.
- 301자/빈 입력/외부 ID는 fetch·trace·onSave0. 정확8192B 허용/8193B 전송 전 거절은 **별도 합성 catalog ID**로 만든 wire 경계이며 실제 catalog를 변경하거나 실제262개만으로 그 길이를 만들었다고 주장하지 않는다.
- transport/trace는 mock이며 `mode:live` 응답도 명시적 stub이다. React mount/effect, 실제 HTTP route, 모델, SQLite/IndexedDB 저장 또는 브라우저 실행 증거가 아니다. `onSave=0`은 제안 callback에서 저장하지 않았다는 증거이며 최종 확인 버튼 자체를 실행한 증거로 확장하지 않는다.
- 이를 보완해 실제 TSX `save` callback도 별도 메모리 AST 추출로9경우 실행했다: 미확인/변경없음/disabled/thinking/saveLock/stale snapshot/stale sequence/바뀐 policy version은 onSave0, 명시 확인된 정상 경우만 mock onSave1이며 OFF·262대상·80,000원·revision5·고정 명령키를 보존했다. 이것도 closure/onSave mock이며 UI effect·실제 거래 QA는 아니다. 기존2줄 외 변경 없음은 직전 검토의 역치환 hash 일치로 확인했고 현재 TSX hash가 같다.

판정은 **POLICY-01 입력 크기·명시 저장 경로의 좁은 코드 PASS**와 **ADR002 revision2 채택 권고**로 분리한다. UI11 Ready `e2450fd`는 main 인계 사실이며 재조회/대기하지 않았다. 새 checker/앱/ADR/index는 수정하지 않았고 이 보고서 말미만 추가했다. 기존1차 결론은 당시 이력으로 보존한다.

METHOD-VERIFY01-01은 이 정책 ACK만으로 운영 방식 채택/PASS가 되지 않는다. POLICY-01의 소비자 수정·좁은 검사 증거는 남지만 시험 제안자 외 별도 운영 채택 판단을 내가 대신하지 않는다. 새 관리자/프레임워크/유료 호출을 만들지 않았으며 CI 구축·비용 권한·보호 holdout·G5/G6는 후속 실행 책임으로 유지한다.
