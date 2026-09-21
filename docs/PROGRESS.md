# 진행 기록

최종 갱신: 2026-09-22 KST. goal 진행 중이며, 최신 D-46에 따라 화면 구현·잦은 Preview 공유를 먼저 수행한다.

## 현재 포인터

```text
현재 task: EVAL-02 두 역할 독립 자료 감사·실제 서비스 응답 대조기 구현
branch: codex/ui-preview-20260921
PR: https://github.com/dokrsky/wanna-gs/pull/1 (draft, 최종 검증 전)
마지막 유효 게이트: 제품 게이트 미실행
마지막 Production deployment: dpl_GB3Cr8At3Com7eJcTnboJ9W4Sika (기존 최소 데모, 최종 제품 아님)
현재 Ready Preview: https://wanna-2434ym5na-d-01.vercel.app/demo (74d2828, POLICY01 앱 동일·EVAL01 증거 기록)
공유 브랜치 주소: https://wanna-gs-git-codex-ui-preview-20260921-d-01.vercel.app/demo
다음 한 가지: 독립 자료/대조기 검토 반례 인계·최소 복구 후 작은 commit/push. 비용 상한 전 대규모 모델 호출 없음
```

## 현재 상태

| 항목 | 상태 | 증거 |
|---|---|---|
| 요구사항·실행 계약·스킬·템플릿 | 최신 지시 반영·문서 검증 완료 | README·card·02·WORKPLAN·GOAL |
| 위임 운영 결정 | ADR-001~006 채택, ADR002 revision2 평가 기준의 두 독립 검토 완료 | DECISION_INDEX, 실행기/전체 독립 품질검증은 후속 |
| GitHub | dokrsky/wanna-gs, 기준 cf6f95a, 작업 branch/PR #1에서 개발 중 | 실제 offline CI 통과·main required gate 설정. 전체 제품 릴리스 게이트 후속 |
| 로컬 설정/사전점검 검사기 | OpenAI 15개 + inventory 10개 테스트 통과 | scripts/ 및 .agents/skills/wanna-gs-preflight/scripts/ |
| 앱·CI·게이트 실행기·DB seed | UI01~11/DATA02/POLICY01 Preview·실제 거래/검색/정책/복원 연결. EVAL01 포함26suite/build 로컬·원격 PASS | D-46·WORKPLAN, Ready5cd1f45·Actions35631676133; 전체 제품 게이트 후속 |
| 자연어 평가 자료·도구 | 고객300/경영주120 합성 초안, 공개336/보호84. 도구 독립 재검토·공개 최소 coverage 통과 | EVAL01. family 비율·별도 장면 정의·독립 의미 검토/실제 baseline 미완료 |
| SQLite | 262개 상품·8점포·524조건 거래 schema3, 고객 검색/니즈/추천·경영주 AI 기록·기존 사본 보존 | DATA02 실제 domain/이전 Preview 이행·거래/픽업/정책 복원 |
| Vercel·OpenAI | Git 자동 Preview 및 UI branch 서버 env 연결. 두 역할·정책·검색v2 실제 호출 관측 | 아래 UI03/06/07 증거; 계정 총 잔액/쿼터 미확인, Production 미변경 |
| 앱 단위·통합·E2E·실제 모델 평가 | 좁은 자체/조정자 검사·일부 독립 반례 확인 및 실제 정상 흐름 관측. 전체 독립 평가·G1~G6 미실행 | 아래 단위별 실행/미실행 구분; Ready를 제품 게이트로 세지 않음 |
| 최종 제출 URL | 미완료 | 기존 wanna-gs.vercel.app은 최소 데모이며 최종 G6 전 |

## 반영한 기준

- 자연어 요청부터 한 점포 수요, 보수적 발주, 공급 확보 후 모의 결제, 입고·픽업 알림부터 정확히 48시간 수령까지 연결한다. 세부 요구는 CORE와 02번을 따른다.
- 문서는 최초 구현의 현재 기준으로 관리하고 Git/결정 이력으로 변경을 추적한다. 재현용 schema·seed·모델·평가 식별값은 유지한다.
- clone/worktree 경로를 실행 시 확인한다. 특정 사용자 홈 경로에 의존하지 않는다.
- card.md의 목적 보존 기준을 시작·인계·복구와 작업/실패/검증 보고서에 연결한다. 실행기·CI 강제는 초기 구현에 포함한다.
- ADR-001에 따라 최소 seed 이후 기능 구현과 전체 자료 수집을 병행한다. 정식 QA·자연어 기준선·최종 게이트는 전체 seed를 요구한다.
- D-44 SQLite와 D-45 OpenAI API를 현재 기준으로 한다. 이전 Neon/Gateway/Gemini 준비 조건을 대체했다. 실제 앱·모델·최종 배포 검증은 남아 있다.
- 강제 full-access 설정과 fixture 기반 중간 Production 제안은 현 실행 계약으로 채택하지 않았다. 중간 공유는 Preview, 최종 Production은 G5 후 G6 검증이다.
- 중복된 과거 리뷰 5개는 [통합 검토 기록](reviews/2026-09-21-execution-proposals.md)에 결론·기존 검사 범위를 보존하고 삭제했다. `.gitignore`로 비밀값·로컬 연결·테스트 부산물·임시 파일을 제외했다.

## 이전 초기 커밋의 검증 기록

아래는 디자인·가치 추가 전 2026-09-21 실제 실행 결과다. 최신 파일 수/ID 수로 오해하지 않는다:

- Markdown 56개: 로컬 링크 242개와 코드 블록 검사 통과. 고정 사용자 홈 경로·문서 릴리스 번호 잔재 없음.
- D 34개·CORE 23개·AC 29개·O 12개·R 44개 ID 순서·중복·누락 검사 통과.
- WORKPLAN Mermaid DAG 35개 노드·55개 간선: 순환 없음. F00은 전체 수집/D05를 기다리지 않고 N01/Q01/Q02/G5는 D05에 의존함을 확인.
- 프로젝트 스킬 8개 `quick_validate.py` 통과.
- `python3 .agents/skills/wanna-gs-preflight/scripts/test_inspect_environment.py -v`: 7개 테스트 통과. 비밀값 정제, docs-only의 READY 오판 방지, timeout, 기존 보고서 보존, 임시 Git 관찰 등을 검사.
- 게시 대상 59개 텍스트 파일의 알려진 토큰·개인키·DB 인증 URL 패턴 검사: 후보 없음. 패턴 검사로 모든 비밀정보 부재를 보증하지 않음.
- 두 독립 검토자 `review_release_proposals`, `review_seed_proposals`가 실행/데이터 의존성과 제품/목적 보존을 검토. README의 전체 seed 대기 표현과 10번의 미구현 화면/API 의존을 수정한 뒤 재검토에서 추가 필수 문제 없음.

문서·스킬과 로컬 검사기 검증이다. 앱 기능·실제 외부 연동·CI 강제·배포 게이트 PASS를 뜻하지 않는다.

## 다음 작업

1. 게시한 화면·거래·모델 연결을 유지하며 전체 seed의 남은 사실/재이용조건과 평가 자료를 준비한다.
2. 비용 상한을 확인한 뒤 실제 모델 평가·제한된 개선을 진행하고, 독립 두 역할 브라우저 QA와 전체 게이트를 연결한다.
3. 발견된 수정은 작은 commit/push·Preview로 계속 공유한다. G5 전 main/Production으로 전환하지 않으며 이미 실행 중인 goal을 다시 만들지 않는다.

## 기록 원칙

작업 ID·사용자 목적·변경·적용 결정·실제 검증·증거·미실행/차단·다음 행동을 남긴다. 오래된 세부 기록은 통합할 수 있으나 실패·블로커를 지우거나 실행 전인 기능을 완료로 표시하지 않는다. 이전 문서 감사와 로컬 검사 이력은 통합 검토 기록에서 확인한다.

## Git 초기화·커밋과 게시 상태

문서 검증과 독립 재검토를 마친 뒤 `git init -b main`을 실행했다. origin은 `https://github.com/Woo-Dong/wanna-gs.git`이다. 59개 파일을 대상으로 `git diff --cached --check`를 통과한 뒤 초기 커밋 `940c31b` (`docs: initialize WANNA GS implementation plan`)을 만들었다.

`GIT_TERMINAL_PROMPT=0 git push -u origin main`은 `could not read Username`으로 실패했다. 현재 Git은 osxkeychain credential helper를 사용하지만 이 실행에서 사용할 HTTPS 인증을 얻지 못했다. 기존 SSH 경로도 BatchMode·StrictHostKeyChecking을 유지해 확인했으나 `Permission denied (publickey)`였다. 계정·키를 새로 만들거나 읽어 출력하지 않았고 원격 이력은 변경하지 않았다. GitHub CLI도 현재 설치돼 있지 않다.

이후 사용자가 직접 push 완료를 알렸다. 2026-09-21 로컬 HEAD와 origin/main이 모두 `8f1765ab8f43d09ac447331fc127a373d174f2f7`임을 확인했다. 후속 원격 읽기는 실행 환경의 DNS 제한으로 확인하지 못했으며 이를 GitHub 인증 실패로 재분류하지 않는다. 위 실패는 과거 이력이고 현재 앱 preflight·배포 완료 근거는 아니다. 이 확인 당시 디자인·가치 관련 변경은 로컬 미커밋 상태였다. 이후 정리 작업은 아래 기록을 따른다.

## 디자인·서비스 가치 추가 작업

- D-35의 ‘원하지쓰’ 가시적 발음 안내와 우리동네GS 참고 디자인, 후속 시안·블루 색상 지시를 26번에 반영했다.
- D-36 입력 예시·조사 날짜·seed 연결·공개 예시/holdout 분리, D-38 캐릭터 참고와 방해 금지 규칙을 추가했다. built-in image_gen으로 색상을 보정하고 무무씨를 참고한 컨셉 일러스트를 넣어 `docs/assets/wanna-gs-promo-mascot.png`에 저장했다. 공식 원본 에셋은 아니다.
- D-37·CORE-25·AC-31과 27번을 추가했다. SKU 매핑·니즈/대체 확인·묶음/보수적 자동발주·분석 기록을 연결하고 동의 없는 대체, 관심의 확약 합산, 미취급/품절/오류 혼동, 반복 승인·과잉 발주를 실패 조건으로 정했다.
- read-only `review_design_contract`는 상태 구별 데이터 부족과 인근 수요 범위 충돌, 대체 동의·편의성 회귀 지표를 지적했다. 01/04/05/07/09/21/23/27 및 작업·완료 계약에 반영했다.
- 추가 외부 피드백은 reviews 기록과 18번/README를 보완했다. 설정 위치를 바로잡고 자동화 bypass와 심사자 공유 접근을 구분했다. forced full-access·checkpoint Production은 채택하지 않았다.

앱·실제 LLM·단위/통합/E2E·배포는 여전히 미실행이다. 그림과 문서 검토는 실행 증거가 아니다. 최신 문서 정적 검사 결과는 아래에 추가한다.

## 디자인·가치 추가 시 문서 검증 결과

2026-09-21 디자인·가치 추가 후 Markdown 59개, 로컬 링크 284개, 코드 블록 짝 검사 통과. D 38개·CORE 25개·AC 31개의 순서/중복/누락과 UX-B01~10·VAL-01~08을 확인했다. `git diff --check` 통과. 구현 시작 토큰의 대비는 흰 글자/행동 블루 4.91:1, 제목/밝은 시안 11.99:1, 보조 글자/흰 바탕 6.04:1이다. 이 계산은 생성 이미지 픽셀이나 아직 없는 실제 UI의 접근성 통과를 뜻하지 않는다.

독립 검토자 `review_design_contract`의 최종 문서 재검토에서 차단할 모순이 없었으며 작업 ID D04A/D04B와 전체 결과 요약 문구 두 곳을 정리했다. 이번에는 앱/스킬 실행 코드를 변경하지 않았고 앱 테스트·preflight live·외부 배포를 실행하지 않았다. 이전 로컬 검사기 7개 테스트 기록은 과거 검증으로 유지한다. Git commit/push도 이번 변경에는 실행하지 않았다.

## 이미지 구현 참고·경영주 팀원 자료 검토

2026-09-21 후속 요청 반영. D-39는 최종 시안을 공통 시각 참고로 채택하고 26번에 이미지 영역→실제 UI/상태→QA 매핑, P02·영역 FE·실제 브라우저 비교·영향 범위 수정·재개 절차를 추가했다. GOAL/WORKPLAN과 작업·UX 보고서 양식에 연결했다. 이미지의 고정 숫자·누락 상태를 기능 명세로 복사하지 않으며 매 반복 재생성하지 않는다. 효율 개선은 설계 판단이고 실제 개발 시간 측정은 아니다.

팀원 폴더 `reviews/wanna-gs-team-handoff-2026-09-21`의 원본 10개를 모두 읽고 현재 상태·업무·데이터·검증/가치 계약과 비교했다. `reviews/2026-09-21-merchant-handoff-review.md`에 M-01~13 후보, 8개 충돌/주의점, 스키마 대응과 사용자 선택 후 병합 순서를 기록했다. D-40에 따라 모든 후보는 미채택이며 실제 제품 기능·스키마·테스트 기대값에 병합하지 않았다. 원본의 픽업 제외/확정 스키마를 이 프로젝트의 최신 지시로 취급하지 않도록 AGENTS/GOAL/리뷰 목록에 경계를 명시했다. 기존 확정 기능의 독립 작업은 진행 가능하다.

이번 정적 검사는 Markdown 71개·로컬 링크 319개·코드 블록, D 40개·CORE 25개·AC 31개와 M-01~13 순서/중복/누락, `git diff --check`를 통과했다. 원본 10개는 작업 전후 SHA-256이 동일하다. 팀원 코드/SQL/실행 로그는 없고 앱·DB·외부 서비스 검증은 수행하지 않았다. 이번에도 commit/push는 실행하지 않았다.

## Neon 후속 설정 안내 반영

2026-09-21 계정 생성 완료를 사용자 보고로 기록하고 `green-unit-60810095`/`production`은 제공된 연결 대상, 실제 존재·접근·역할은 미검증으로 구분했다. 28번 가이드와 README·06/08/18/25번·문서/출처 목록을 연결했다. Neon 배포와 Vercel 배포, Neon AI Gateway와 기존 모델 경로를 구별하고 CLI/MCP/skills/config의 선택 범위를 명시했다. `.gitignore`에 로컬 연결 포인터 `.neon`을 추가했다.

명령 설치/로그인·MCP/skills 설치·키 생성·link·config init·deploy·DB 쓰기·유료 변경은 실행하지 않았다. Neon 계정 생성만으로 preflight READY를 선언하지 않았다. 팀원 자료의 D-40 미병합 상태는 유지한다. commit/push도 실행하지 않았다.

이번 문서 정적 검사는 Markdown 72개·로컬 링크 326개·코드 블록·D 40개/CORE 25개/AC 31개를 통과했다. `git diff --check`와 `.neon`/`.env.local`의 ignore 동작을 확인했다. 앱·Neon 실제 접속 테스트는 실행하지 않았다.

## 경영주 기능 재판단과 사용자 기준 반영

2026-09-21 D-41 모집 목표 초과 접수 유지, D-42 잘못된 자동 구매·입고 전 수령 만료를 일으키는 기한 결합 기각을 사용자 직접 결정으로 기록했다. 03/04/07/09·결정 인덱스·card·GOAL·README에 연결했다. MOQ는 접수 상한이 아니며 동의 유효기간 O-03의 구체 값과 부분 배정 O-01은 미정으로 유지한다.

경영주 비교 검토 보고서에 M-01~13의 최신 채택/수정/보류 권고와 원본 그대로 기각할 8개 동작을 정리했다. 나머지 기능은 사용자 선택 전이며 D-40의 경계를 유지한다. 팀원 원본 10개 SHA-256은 기존 보존 기록과 동일하다.

문서 정적 검사: Markdown 72개·로컬 링크 327개·코드 블록·D 42개/CORE 25개/AC 31개 검사 통과. `git diff --check` 통과. 앱/DB/LLM 테스트·배포·commit/push는 실행하지 않았다. 다음은 사용자가 권고 항목을 선택한 뒤 관련 기능 명세·작업 계약에 병합하는 것이다.

## 경영주 상품↔고객 요청 상세 조회 추가

2026-09-21 사용자가 경영주가 상품 단위 집계에서 고객 단위 요청 상세로 내려가 상품·수량·가격·동의 여부/시각·접수 순번·발주 연결·확보/배정/결제/예약/픽업 상태를 확인하도록 요구했다. 이를 새 거래 생명주기나 건별 승인으로 확장하지 않고 D-43 직접 결정, CORE-26, FR-13, AC-32로 추가했다.

- 03/05/07: 상품 집계→고객 상세 흐름, 기존 관계를 이용하는 읽기 전용 조회, 제안 API와 필드/권한 계약을 연결했다.
- 20/21/27: merchant UX/FE/BE 책임, 독립 merchant-qa 항목, 상품 합계·고객 행 합계와 세션/점포 격리 불변식을 연결했다.
- 09/WORKPLAN/GOAL/README: 단위·실제 DB·G3·경영주 G4·G5/G6 적용 범위와 완료 체크를 추가했다.
- `.agents/skills/wanna-gs-ux-audit/SKILL.md`와 `wanna-gs-verify/SKILL.md`: 5개 정보, 합계/상태/권한 대조를 실행 규칙에 추가했다.
- 아직 앱·DB·API·브라우저·독립 QA는 실행하지 않았다. 동의 유효기간 O-03 등 기존 미정 정책은 임의로 확정하지 않았다.

## 문서 정리·커밋 대상 요약

2026-09-21 사용자가 현재 변경 전체의 정리와 로컬 Git commit을 요청했다. push는 사용자가 직접 진행하므로 실행하지 않는다.

- 26번: 우리동네GS 참고 색상·원하지쓰 발음·두 역할 입력 예시·캐릭터·시안에서 실제 화면으로 구현하고 검증하는 절차. 이미지 3개와 생성 기록 포함.
- 27번: 정확한 SKU/대체 후보·미충족 니즈 보존, 경영주 묶음 처리·보수적 자동발주, 불편을 늘리지 않는 검증 기준. CORE-24/25·AC-30/31 및 작업 계획에 연결.
- 28번: Neon 계정 생성 이후 인증·브랜치 분리·연결 검증과 선택 CLI/MCP/skills 안내. `.neon`은 로컬 설정으로 제외.
- 경영주 검토: 팀원 원본과 비교·재판단 기록을 보존. D-41/42는 반영하고 나머지 M 기능은 사용자 선택 전 상태를 유지.
- 실행 준비: Codex 설정 위치·실제 권한 확인, Vercel 자동 테스트 접근과 심사자 공유 접근의 구분을 보완. 기존 릴리스 계약 유지.

문서 링크·코드 블록·결정 ID·공백 검사를 최종 실행하고 커밋한다. 앱 기능·배포·외부 연동은 이번 작업에 포함되지 않으며 기존 테스트 계획을 실행 완료로 표시하지 않는다. 아래의 과거 미커밋·미실행 기록은 각 작업 당시 상태다. 커밋 결과와 실제 SHA는 Git 이력에서 확인한다.

## 고객 상세 조회 요구사항 커밋·게시 요청

2026-09-21 사용자가 직전 D-43 변경의 commit과 push를 요청했다. 변경된 문서·스킬 21개만 대상으로 하며 관련 없는 `.idea/`는 제외한다. 커밋 제목과 본문은 각 줄 50자 이내로 작성한다.

`git diff --check`, 변경 문서의 코드 블록 짝·추가 로컬 링크, D 43개·CORE 26개·AC 32개·FR 13개의 순서/중복/누락 검사가 통과했다. 원격 main과 작업 전 HEAD의 일치를 확인했다. 앱·DB·브라우저 테스트와 독립 제품 QA는 미실행이다. 게시 완료는 push 결과와 원격 SHA 대조로 확인하며, 이후 README의 환경 준비·preflight와 별도 goal에서 CORE-26/AC-32를 구현·검증한다.

## SQLite·OpenAI API 전환 — 2026-09-21

사용자 D-44/45를 반영해 아키텍처·서비스/API 계약·goal·WORKPLAN·검증/복구·데이터·UX·배포·핵심 요구·결정 인덱스와 관련 스킬을 갱신했다. DB는 로컬 생성 seed.sqlite를 Vercel 정적 자산으로 제공하고 한 탭의 sql.js가 실행하며 IndexedDB에는 SQLite 사본을 저장한다. 서버는 OpenAI 모델 API만 담당한다. 200개 이상 상품 생성, 동일 seed/catalog manifest, 실제 SQL 및 브라우저 저장·복원 검증은 goal 구현 작업이다.

.env.example과 빈 키의 .env.local을 준비했다. .env.local은 Git 무시 대상으로 확인했다. 키 값 없이 모델/모드만 안내하며 scripts/check_openai_env.py의 기본 실행에서 OPENAI_API_KEY MISSING, live=not_run, ready_for_goal=false, 종료코드 2를 확인했다. 실제 OpenAI 요청은 보내지 않았다. --live는 사용자가 키를 넣은 뒤 별도로 실행할 소량 연결 시험이다.

실제 검증: OpenAI 검사기 15개 unit test, inventory 10개 unit test, 스킬 8개 quick_validate 통과. Markdown 73개·로컬 링크 337개·코드 블록·D44/CORE25/AC31 순서·중복·누락 검사 및 git diff --check 통과. 팀원 원본 10개의 SHA-256은 작업 전과 동일하다. sqlite_migration_review와 openai_env_checker의 독립 문서 검토에서 지적한 서버 상태·예비 모델 경로·검사 결과 설명을 수정했다. 이 증거는 문서와 설정 검사기의 검증이며 앱 SQL/WASM·live API·Vercel·제품 G1~G6 통과가 아니다.

직전 문서 정리 커밋은 1a5e8a2다. 이번 변경은 로컬 미커밋 상태이며 commit/push·goal 실행·외부 배포는 하지 않았다. 키 입력·연결 점검 후 별도 goal로 앱 구현을 시작한다.

## 원격 main과 SQLite/OpenAI 문서 통합

2026-09-21 `git fetch origin`으로 원격 `09c3cc3`의 경영주 상품→고객 상세 명세를 확인했다. 로컬 변경을 `codex/sqlite-openai-docs-sync`의 `63535e6`으로 보존한 뒤 일반 merge로 통합했다. 12개 파일의 충돌은 양쪽 요구를 대조해 해결했고 원격 커밋을 제거하거나 공유 이력을 재작성하지 않았다.

이미 게시된 D-43(경영주 상세 조회)을 유지했다. 미게시 SQLite D-43은 D-44, OpenAI D-44는 D-45로 변경하고 문서·스킬의 참조를 함께 갱신했다. 과거 검증 기록의 ID 개수는 당시 기준이다. 최종 원장은 D 45개·CORE 26개·AC 32개·FR 13개다.

경영주 상세는 로컬 조회 서비스로 연결하고 합성 고객·읽기 전용·동의/순번/발주/이행 상태·집계 일치·불일치 시 승인 중단을 유지했다. 같은 SQLite snapshot과 요청별 집계로 중복 합산을 막는 계약을 보완했다. 다중 브라우저 공유·서버 거래 DB·다중 사용자 경합 검사는 되살리지 않았다.

통합 검증은 설정 검사기 15개·환경 inventory 10개 unit test, Markdown 73개·로컬 링크 337개·코드 블록·결정/요구/AC 순서 검사, 충돌 표시 및 diff 공백 검사다. 실제 앱·API·배포 검증은 미실행이다. 독립 검토자 review_remote_integration이 원격 요구 보존과 SQLite 경계를 확인했으며 병합을 막을 문제가 없다고 판정했다. 스킬 8개 형식 검사·FR 13개 순서 검사·팀원 원본 10개 hash 보존도 확인했다. 기본 Python의 PyYAML 누락으로 형식 검사 실행이 한 번 실패해, PyYAML이 설치된 기존 Anaconda Python으로 재실행했다. 게시 절차는 16번에 fetch→작업 커밋→merge→영향 검증→main fast-forward→일반 push로 보강했다.

통합 커밋 이후 사용자가 push한다. 최종 merge SHA와 원격 대비 상태는 `git log` 및 `git status -sb`로 확인한다. push 전 원격이 다시 바뀌면 새 변경을 통합·검증하며 force push하지 않는다.

## Vercel 실행 환경 및 최소 데모 배포 — 2026-09-21

사용자 요청에 따라 원격 `main`의 `2afd4364` (`feat: add Vercel-ready demo app`)를 fetch 후 로컬 `main`에 fast-forward했다. `d-01/wanna-gs` Vercel 프로젝트를 CLI로 연결했고, `.vercel/project.json`은 로컬 전용으로 유지한다. Vercel 프로젝트의 Git 연결은 `dokrsky/wanna-gs`, Production branch는 `main`, framework는 Next.js, Node.js는 24.x로 확인했다.

로컬 `npm ci`와 `npm run build`가 통과했다. `vercel --prod --yes --scope d-01`로 `dpl_GB3Cr8At3Com7eJcTnboJ9W4Sika`를 배포했고, Production 상태 `Ready`, alias `https://wanna-gs.vercel.app` 및 `https://wanna-gs-d-01.vercel.app`를 확인했다. `GET /api/health`는 `{"ok":true,"service":"wanna-gs","mode":"live"}`를 반환했고, 첫 화면의 원하GS·원하지쓰·데모 안내 텍스트를 HTTP 응답에서 확인했다.

사전점검은 `PARTIAL`이다. GitHub CLI 계정 `dokrsky`와 Vercel CLI 계정 `simoon-3113` 인증·프로젝트 연결은 확인했지만, Vercel 환경변수는 현재 0개이고 `OPENAI_API_KEY`가 없어 실제 모델 호출은 `not_run`이다. sql.js/WASM·IndexedDB·제품 SQLite·브라우저 수직 흐름·독립 제품 QA·G1~G6는 아직 미검증이며, 이번 배포는 최소 데모의 환경 연결을 증명할 뿐이다. 기존 미추적 `.idea/`는 사용자 파일로 보존하고 커밋하지 않는다.

## 로컬 OpenAI 키 입력 후 재검사 — 2026-09-21

사용자의 `.env.local` 입력 후 재검사 요청으로 `python3 scripts/check_openai_env.py`는 `CONFIGURED`, `--live`는 실제 Responses API 한 번 호출 후 `CONNECTED`·종료코드 0을 반환했다. 키 값은 출력하지 않았으며 `.env.local`의 Git 무시도 확인했다. D-45·CORE-23의 로컬 연결 증거이며, 제품 품질·구조화 출력·전체 preflight 통과를 뜻하지 않는다.

같은 시점 `vercel env ls --scope d-01 --project wanna-gs`는 환경변수 0개를 반환했다. Vercel 서버 설정·배포 호출 검증은 남아 있으며 전체 준비 상태는 `PARTIAL`이다. 다음 작업은 Vercel Preview/Production의 서버 환경변수 등록과 실제 앱 모델 호출 경로의 검증이다. 이번 재검사에서 외부 설정 변경·재배포·commit/push는 수행하지 않았다.

## 화면 우선 전환·첫 Preview — 2026-09-21

최신 사용자 D-46에 따라 별도 preflight 시험 앱/선행 정책 감사를 멈추고 Meitner를 고객 화면, Newton을 경영주 화면에 배정했다. 조정자가 공통 스타일·역할 전환·화면용 상태를 통합했다. 최신 시안의 시안/블루·원하지쓰 안내를 적용했고 합성 데이터·로컬 검색·메모리 한계와 미연결 기능을 표시했다. 기존 preflight worktree는 삭제하지 않았으며 제품 완료로 세지 않는다.

`0e43f0dda33275b1040a906c3a1e3219ea309c95`를 `codex/ui-preview-20260921`에 commit/push했다. [PR #1](https://github.com/dokrsky/wanna-gs/pull/1)은 draft다. Git 연동이 자동 생성한 `dpl_HEBt64yrCyhQreUhnQejWYwxR49x`의 source SHA 일치·Ready와 [실제 Preview](https://wanna-j6xntmurw-d-01.vercel.app) 화면 로딩을 브라우저에서 확인했다. 브랜치 최신 주소는 https://wanna-gs-git-codex-ui-preview-20260921-d-01.vercel.app 이다. Production은 변경하지 않았다.

최소 확인: Node 24.12의 Next 15.5.25 build/타입 검사 PASS, 로컬 브라우저의 매일우유 예시 검색과 경영주 역할 전환, staged 17개 파일의 실제 키 포함 여부 검사 PASS. 이는 독립 제품 QA·전체 G1~G6가 아니다. `.env.local`은 Git 제외이고 로컬 실제 OpenAI CONNECTED를 재확인했다. Vercel Git 연결의 이전 repoId를 현재 ID로 복구했으며 probe 전용 Preview 서버 env만 등록했다. UI Preview는 실제 모델을 아직 호출하지 않는다.

Locke는 초기 조사 확보분을 별도 research worktree에 보존하고 다음 SQLite 연결 구현으로 이동했다. 공통 schema/lockfile은 이 담당자 한 명만 수정하며 첫 Preview를 기다리게 하지 않았다. 다음 단계는 저장 완료 뒤 성공 표시·새로고침 복원·역할 전환을 연결한 두 번째 Preview다.

## UI-02 브라우저 SQLite 연결 — 2026-09-21

실제 sql.js 1.14.2로 생성한 seed.sqlite/WASM을 빌드 자산으로 배포하고, 브라우저 SQLite 사본을 IndexedDB에 저장한다. 저장 완료 뒤 요청/승인 성공과 화면 상태를 반영하며 실패 시 이전 저장본을 유지한다. 손상/버전 불일치는 자동 초기화하지 않고 안내·명시적 초기화를 제공한다. UI는 저장 중 중복 명령을 막는다. 전체 domain/200개 상품 seed 완료가 아니라 UI-02의 중간 구조다.

실행: `npm run check:preview-store`의 SQL 제약/FK/export-import/저장 및 reset 실패 보존 검사 PASS; Node 24.12에서 build·타입 PASS. 로컬 브라우저에서 매일우유 1개·2,800원·원하데모점 요청 저장→새로고침→내 요청 1건 복원→경영주 집계 5명/9개/25,500원 확인. 아직 Preview의 동일 동작·독립 전체 QA·전체 도메인/E2E 게이트는 미실행이다. 실제 AI 검색 API는 별도 변경으로 병렬 구현 중이며 이번 저장 커밋에는 포함하지 않는다.

`9c4d41c7c9d17f315829ea6d35c9ef62f4d126e3` commit/push로 `dpl_FSVYAZgP4XVt3Ne4sCkS1RDQi2dB` / https://wanna-226yzu152-d-01.vercel.app 가 Ready가 됐다. source SHA 일치와 최신 브랜치 주소에서 실제 WASM/seed/IndexedDB 초기화 후 ‘이 브라우저에 저장됨’ 화면을 확인했다. Preview의 새로고침 수직 흐름은 아직 로컬 증거와 구분한다.

UI-03은 공식 Responses/Structured Outputs 문서에 맞춰 공식 SDK 서버 경로를 사용한다. https://developers.openai.com/api/docs/guides/structured-outputs 및 https://developers.openai.com/api/docs/models/gpt-5-mini 확인. 보호된 Preview 설정을 재조회한 뒤 UI branch에 한정해 서버 모델 env와 ASSISTANT_PREVIEW_ENABLED를 등록했다. Production에는 등록하지 않았으며 실제 AI API도 Production에서는 기본 비활성이다. env 존재/health만으로 연결 성공을 주장하지 않고 실제 검색 결과를 별도로 확인한다. 계정 잔액/전체 한도는 unknown이며 이번 연결 확인은 소량 2회(로컬·Preview 각 1회)를 우선 계획한다.

UI-03 로컬 실행: API offline checker PASS(실제 호출 0회), Next build·타입 PASS, 클라이언트 빌드 19개 파일에 실제 키가 포함되지 않음 확인. 실제 `/api/assistant/search` 1회에서 ‘우유 말고 차갑게 마실 커피를 찾아줘’→gpt-5-mini·candidateIds=[coffee]·matched, 입력 719/출력 127 tokens. 입력의 우유 제외 조건을 반영했다. 로컬 화면은 실제 AI 설정·명시적 로컬 모드 전환을 표시하고 기존 SQLite 요청 1건도 유지했다. 전체 카탈로그/자연어 품질 통과는 아니며, Preview live는 새 배포 후 확인한다.

`18b0b310ad7e7852f09e4ff228cee997279419a5` commit/push로 `dpl_7pX9do6RduNV1aqdKP6XdFa9nuLH` / https://wanna-o4yc9bsi9-d-01.vercel.app 가 Ready가 됐고 source SHA가 일치했다. 최신 브랜치 Preview의 실제 브라우저에서 같은 커피 검색 1회가 성공했다. ‘실제 AI · gpt-5-mini’·콜드브루 커피 후보·입력 719/출력 136 tokens를 확인했다. 이번 UI-03 연결 확인은 계획대로 로컬 1회·Preview 1회로 마쳤다. 전체 품질 평가나 독립 G4/G6 PASS를 의미하지 않는다. 경영주 AI와 DATA-01은 별도 소유 파일에서 병렬 구현 중이다.

## UI-03B 경영주 AI 연결·다음 데이터 단계 — 2026-09-21

경영주 지시도 서버 OpenAI를 호출해 이번 묶음의 조회/선택/예산 변경안으로만 반환한다. 사용자가 변경안을 적용한 뒤 발주 승인은 따로 한다. 미래 정책은 아직 미연결로 표시하고 자동 저장하지 않는다. 서버/client가 같은 허용 ID·예산·선택 후상태 계약을 사용하도록 맞췄다. ‘우유만’의 기존 선택 교체와 ‘우유도’의 명시 합집합을 구별하며, 점포/요청/예산 변경 시 낡은 제안은 적용하지 않는다.

최소 확인: 두 역할 assistant offline checker PASS(실제 호출 0회), Node24 Next build·타입 PASS. Preview 배포 후 경영주 실제 호출 1회로 변경안→사용자 확인을 확인할 계획이다. 전체 품질/도메인/독립 QA는 미실행이며 현재 승인은 공급·결제 완료가 아니다.

DATA-01은 242개 상품 초안(공식 이름 확인 12·미검증 참고 27·합성 203), 실제 점포 8곳, 합성 고객 20/경영주 8, 모의 availability 484행(25%)을 별도로 생성했다. 생성기 일치 자체 검사는 PASS지만 최근 인기/출시와 실제 GS SKU 전체 확인은 미완료다. 현재 앱의 6개 중간 seed와는 아직 별도다. Locke가 전체 SQLite 연결과 기존 snapshot을 지우지 않는 업그레이드를 이어간다. 공급/결제/픽업용 ADR-003 초안은 두 독립 검토에 배정했으며 현재 UI 배포를 막지 않는다.

`bd13e3fd443c3c1a79a81d478712f2b50c631000` commit/push → `dpl_3gABKwyNjAXvGFDi4weRFM1Mx4L1` / https://wanna-ivr84so9x-d-01.vercel.app Ready 및 source SHA 일치 확인. 실제 Preview 브라우저에서 경영주 호출 1회: ‘샌드위치는 빼고 예산 2만원 안에서 이번 요청을 선택해줘’→gpt-5-mini 변경안, 우유/소금빵 2건·5개·12,200원. 적용 전 선택 0/예산50,000원 유지, 명시 적용 후 선택2/예산20,000원, 승인0 유지 확인. 발주 승인 버튼은 별도로 남겼다. 이번 merchant 호출의 사용량 패널을 펼쳤지만 적용으로 닫기 전 수치는 기록하지 못했으므로 토큰 수는 미기록이다. 모델 응답 품질 전수/독립 E2E와 구분한다.

ADR-003은 Meitner 제품/범위와 Newton 상태/실패의 독립 검토 및 보완 재확인 뒤 후속 UI-04 후보 범위에 adopted로 전환했다. 수량 감소 순번 예외, 취소로 연결이 사라진 미확정 물량 차감, 이미 입고된 잔량 예약의 최초 픽업 알림을 명확히 했다. 현재 UI03B에 거래 기능이 구현됐다는 뜻은 아니며 최종 검증은 이후다.

후속 소유권: Locke는 `app/demo-preview.ts`·`app/preview-store.ts`·seed builder의 DATA-02 연결/업그레이드, Newton은 두 역할 component의 상품 출처/실제 점포/모의 요청 가능 조건, Meitner는 새 `lib/domain/**`의 ADR-003 명령/공유 타입·자체 검사다. 공통 SQLite 스키마/seed는 Locke 한 명, domain 타입/명령은 Meitner 한 명이 작성한다. 조정자는 page/API 경계 통합·배포를 맡는다. 현재 uncommitted 작업이며 각각 handback 후 통합한다. Vercel 프로젝트 production target을 다시 읽어 기존 `dpl_GB3Cr8At3Com7eJcTnboJ9W4Sika`·source `2afd436439dc5f23fe287c519d9e41a777a809a0` 유지도 확인했다.

## DATA-02 화면·SQLite 통합 — 2026-09-21

이전 goal turn은 진행으로 분류한다: `bd13e3f` push·새 Ready Preview·실제 경영주 AI 제안/명시 적용 증거를 확보했다. 현재 DATA-02는 242개 공통 상품 마스터·실제 위치 참고 점포 8곳·기존 가상 점포 2곳·20명 신규 합성 요청과 기존 4요청·availability 484행을 SQLite에 넣는다. 이름/규격 일부만 출처 확인됐으며 대부분 합성인 데이터 초안이다. 가격·공급·고객은 모의, 지도와 상품 사실 최종 검증은 후속이다.

화면은 상품 출처 구분과 실제 점포 주소/좌표·모의 가격/요청 가능 조건을 표시한다. 조건이 없는 점포는 품절로 단정하지 않고 미확인으로 표시하며 요청 생성하지 않는다. 신규 고객 요청은 실제 점포 참고 8곳의 모의 조건에만 연결하고 기존 가상 점포 요청·승인은 재매핑 없이 보존한다.

알려진 v1 snapshot만 v2로 업그레이드하고 추가 요청·가격·승인·점포·순서를 보존한다. 영구 저장 완료 전 새 상태를 내보내지 않으며 실패/알 수 없는 버전은 기존 사본을 지우지 않는다. 실제 Node24 `check:preview-store`의 전체 SQL/FK·upgrade 보존/실패/재시도·잘못된 버전 거절 PASS, 242개 마스터로 assistant offline checker PASS(실제 호출 0회). 브라우저 업그레이드·빌드·배포 확인은 이어서 실행한다. 이 검사는 전체 domain/독립 제품 게이트가 아니다.

`aa548381d8d0ee3e2b5764142e1b060d4a6a9ca8`를 로컬 commit 후 동일 SHA의 분리 checkout에서 Node24 Next build·타입 PASS, 20개 클라이언트 빌드 파일의 실제 키 비포함 확인 후 push했다. `dpl_7Qd4AY5BLyzjDT6ARc7cdBom87XG` / https://wanna-2y1lgry17-d-01.vercel.app Ready·source SHA 일치를 확인했다. 분리 checkout은 병렬 작성 중인 미게시 domain 파일과 배포 후보를 섞지 않기 위해 사용했다.

실제 로컬 브라우저에서 기존 v1의 내 요청(매일우유1개·2,800원·GS25원하데모점·동의함)이 v2에서도 그대로 보존됨을 확인했다. 실제 Preview도 242개/8곳 안내와 SQLite 저장 완료로 로드됐다. 앱 품질 전수·독립 브라우저 QA·상품 사실 검증 PASS가 아니다.

DATA-02 실제 Preview 호출 1회: ‘들깨랑 버섯이 들어간 도시락을 찾아줘’→합성 상품 ‘데모 들깨버섯밥 도시락 320g’ 후보, gpt-5-mini 입력22,949/출력193 tokens를 확인했다. GS25역삼미래점의 모의 조건 1,200원·1개·직접 동의로 저장 후 새로고침해 내 요청 복원을 확인했다. 조건 없는 다른 점포는 ‘미확인’으로 비활성이고 품절로 단정하지 않았다. 현재 전체 카탈로그 입력 비용은 후속 자연어 실험에서 개선할 대상이며 이번 한 번으로 품질 기준선을 대신하지 않는다.

## UI-04 거래 화면·정규화 SQLite — 2026-09-21

사용자 목적: CORE-02~10·26/ADR-003의 고객 요청→점포 수요→보수적 발주→공급 확보·모의 결제→입고·48시간 픽업을 실제 화면에서 이어간다. `/demo`에 별도 거래 사본을 시작하고 기존 Preview 원본 및 보관 이력은 삭제하지 않는다. 예전 ‘화면 승인’을 발주로 재해석하지 않는다. 기존 고객 AI 검색과 경영주 현재 묶음 AI 제안/명시 적용을 재사용했다. 미래 정책 AI는 미연결이며 수동 정책 폼은 명시 확인 후 저장한다.

Meitner 도메인, Locke SQL·저장, Newton 화면 handback 후 조정자가 연결했다. 242상품/8점포/484조건/29역할(기존28+현재고객)/20합성 요청을 사용하며 실제 거래 조건은 모두 모의다. 7일 동의·중복 명령·순번/FIFO·예산/공급/결제 실패·전량 입고·정확한48시간을 순수 명령과 SQL 제약으로 연결했다. 저장 완료 후 화면에 공개하며 이전 DB를 새로운 구매 동의로 바꾸지 않는다.

UI04-BUILD-01: 최초 통합 Next build는 `commands.ts`의 `requireRule as require` 별칭을 webpack이 CommonJS 호출로 정적 분석해 실패했다. 거래 미실행 상태의 빌드/코드 분류이며 정책 공백·외부 차단은 아니다. 조정자가 소유권 반환 후 별칭/64곳 호출만 `requireRule`로 치환했다. Meitner 읽기 전용 재검토에서 역치환 파일 해시가 기존 handback과 일치해 로직·정책·기대값 변경 없음 확인. 한 번 수정 후 Node24 도메인 92명령/거절 checker 및 Next15.5.25 build/타입 PASS로 복구했다. 정상 요청/이행·인접 권한/예산 규칙을 삭제하거나 테스트를 skip하지 않았다. 이는 해당 이름 충돌 검토이며 전체 독립 도메인 QA는 아니다.

실제 최소 확인: `check:domain-store` 정상 SQL 요청→발주→공급→결제→입고→수령, CHECK/FK/rollback, 지연·실패 저장/초기화, 재전송/낡은 명령, restore·손상/버전 거절·이전 승인 이력 보존 PASS. 새 클라이언트 빌드22개 파일에 실제 서버 키 비포함 확인. 이 SQL 검사기의 저장 지연/실패는 Node seam이며 브라우저 장애 주입 증거와 구분한다.

로컬 브라우저 `localhost:3101/demo`: 명시 로컬 예시 검색(AI 아님)으로 콜드브루1개·GS25역삼띵동점·2,500원 확인/동의 저장(revision1), 경영주 예산10,000원 명시 저장(2), 매입1,600원 발주(3), 공급1개 확정으로 모의 결제성공/예약·입고대기(4), 전량입고(5), 고객 픽업 알림 2026-09-21 22:53:16 KST·마감09-23 22:53:16 확인. 새로고침 후 revision5·입고/마감 복원, 해당 예약번호로 경영주 전량수령(6) 완료. 실제 청구/외부 알림은 없으며 Preview의 해당 수직 흐름·독립 G4/G6는 아직 미실행이다.

현재 base `aa54838`, branch `codex/ui-preview-20260921`, PR #1 draft. Preview 게시 후 정확한 source SHA·Ready·화면 확인을 기록한다. 별도 전체 정책/자연어 평가·보안/UX/실패 E2E·제품 CI는 후속이다. 미식별 니즈·미래 정책 AI·지도 및 데이터 사실 보강도 남아 있어 goal 완료로 표시하지 않는다.

`b4a285411f7bfb55975770eee606848cefcd9855` commit/push → `dpl_3NyU16qFWujHU5ny2msrwdRW9inK` / https://wanna-e2y9lytyw-d-01.vercel.app/demo Ready·source SHA 일치 확인. 최신 브랜치 `/demo`의 실제 브라우저에서 별도 사본 시작→revision0 저장·실제 AI 설정 표시·이전 들깨버섯밥1개/역삼미래점/1,200원 요청 보관 이력을 확인했다. 이 호출은 모델 요청이 아니며 UI-04에서 추가 live 모델 호출은 0회다. Production은 변경하지 않았다. 이번 goal turn은 UI-04 구현·커밋/배포·수직 흐름 증거를 추가한 진행이다.

UI-05 준비는 O-10 점포 지도에만 제한한다. 공식 OSM 공유 iframe/타일 정책 근거를 읽고 ADR-004를 초안으로 두 관점 독립 검토에 보냈다. 가상 고객 위치·현재 선택 점포 한 곳·주소 목록 fallback이며 새 지도 SDK/유료 계정/실제 GPS는 도입하지 않는다. 미식별 저장의 기존 SQL 사본 보존 방법은 별도 읽기 전용 준비 중이며 아직 schema를 바꾸지 않았다.

## UI-05 점포 지도 — 2026-09-21

ADR-004를 두 독립 정책 검토 후 채택하고 Newton이 4개 소유 파일을 구현·반환했다. 고객 조건 확인에서 동일 선택 점포의 주소·가상 기준점 직선거리·명시 외부 지도 보기/닫기/재시도를 제공한다. 출처·위치 신뢰도·외부 연결 정보와 OSM attribution을 표시한다. 좌표·점포가 바뀌면 이전 iframe 상태를 폐기하고 요청/동의/거래 DB는 변경하지 않는다. helper 자체 검사는 8개 공개 점포·잘못된 좌표/bbox·공개 정보만 포함한 URL을 통과했다. 실제 지도 표시와 build/배포는 이어서 확인하며 전체 독립 UX 통과를 의미하지 않는다.

`10127722d2646efec3d3454f664292f4058ffe6b`를 분리 checkout의 Node24 Next build·타입 및 실제 키 클라이언트20파일 비포함 확인 후 push했다. `dpl_Ffqf6pFUg9jWVQVm9xm18f9stGY6` / https://wanna-oqy7pa6wz-d-01.vercel.app/demo Ready·source SHA 일치. 실제 Preview의 GS25역삼띵동점 주소·직선거리148m·지도 명시 버튼은 표시됐으나 외부 iframe이 최초/수동 재시도 각12초 뒤 지연 안내로 전환됐다. 정상 타일/마커 렌더는 미확인이고 재시도는 더 반복하지 않았다. 지도 지연 중에도 콜드브루1개·2,500원 확인/7일동의→요청 저장(revision1·순번21, 23:12:05 KST)은 성공했다. 외부 지도 원인/실제 렌더 증거는 후속 UX 검증에서 다시 확인하며 기능 삭제나 가짜 성공 처리는 하지 않는다. UI05 실제 모델 호출0회, Production 변경 없음.

## UI-06 지속 정책 AI — 2026-09-21

Meitner가 별도 `/api/assistant/policy`와 nullable 변경 계약을 구현했다. 기존 정책의 활성·대상 전체집합·누적 매입 예산에 대한 제안만 반환하며 실제 저장/발주를 수행하지 않는다. Newton 화면은 저장된 정책 기준임을 고지하고 전후 비교→별도 최종확인→로컬 `policy.set`으로 연결한다. 수동 미저장 초안을 자동 덮어쓰지 않으며 새 입력·점포/역할/reset·revision 변경의 낡은 결과를 버린다. 켜진 정책 저장은 현재 수요에도 발주할 수 있음을 확인하고 기존 발주는 끄기만으로 취소되지 않는다.

자체 offline API checker와 대상 TypeScript PASS; 조정자도 동일 offline checker를 실행했다. 60/242개 대상 유지·교체, used 예산 하한·낡은 정책·불완전 출력·4KiB UTF-8 경계를 확인했다. 현재 실제 AI 정책 해석/브라우저는 미실행이며 build/Preview 후 소량 호출로 확인한다. 전체 독립 정책 품질·G5/G6는 후속이다.

UI07의 미식별 니즈/추가 질문은 ADR-005를 Newton/Locke 독립 문서 검토 후 채택했다. 최초 제외조건 유지·경영주에게 원문 개인정보 비공개·행동별 재시도 키·모델 성공과 저장 실패 분리를 보완했다. Meitner 검색 API, Locke 공통 domain/SQL 단일 작성으로 DTO를 합의 중이며 UI06 배포 후보와 섞지 않는다.

`5502200cb7c404b8cc54793d280b862ed2067b63` 분리 checkout의 Node24 offline 정책 checker·Next build/타입 PASS, 클라이언트21파일 실제 서버 키 비포함 확인 후 push. `dpl_93Y2dm6xhr1C4hPD85YbTC1NS1yo` / https://wanna-1mb2mfcxx-d-01.vercel.app/demo Ready·정확한 source SHA 확인. 실제 Preview 호출1회: ‘앞으로 콜드브루 커피 300ml만 자동발주 대상으로 켜고 누적 매입 예산을 1만원으로 설정해줘’→gpt-5-mini, OFF→ON·대상없음→coffee1종·0→10,000원 제안. 입력23,731/출력342 tokens. 최종 확인 전 revision1·예산0·발주0 유지, 명시 저장 후 revision2·누적예산10,000/사용1,600/잔여8,400원·콜드브루1개 정책 자동발주. 공급 확정/예약은 아직0이며 성공을 과장하지 않는다. 새로고침 후 같은 정책/발주/금액 복원 확인. 브라우저 역할 클릭1회가 도구 응답 지연으로 실패해 실제 화면을 다시 읽고 정상 재시도했으며 앱 명령 중복이나 정책 재호출은 없었다.

현재 UI07은 Meitner 검색 대화 API, Locke 부가명령·SQL migration, Newton 고객 대화/기록 UI, 조정자 경영주 안전 니즈 조회/페이지 어댑터로 소유 파일을 나눠 구현 중이다. 고정 DTO/Props ACK를 교환했다. 모드 live/local/fixture를 구분하고 unsupported 성공을 미식별 또는 오류로 바꾸지 않는다. 기존 저장 원본을 보존하며 부가기록은 정산/자동발주를 수행하지 않는다. 아직 통합·검증·게시 전이다. 이번 turn은 작은 두 commit/push/Ready와 실제 정책 저장 증거를 추가한 진행이다. 지도 정상 렌더·후속 화면·전체 goal 검증 및 Production 제출은 남아 있다.

## UI-07 추가 질문·니즈/추천 기록 — 2026-09-21

최초 문장·최대2개 질문/답변을 전달하는 v2 검색을 `/demo`에 연결했다. 질문은 상한이지 의무가 아니며 정확한 후보는 바로 확인한다. 후보별 일치/확인 필요/대체·카탈로그 근거·원문 단서·필수/제외/선호를 구분한다. 기존 `/` 검색과 경영주 현재묶음/정책 API는 유지했다. legacy 역할 전환도 숨겨진 컴포넌트를 계속 실행하지 않도록 unmount해 늦은 응답을 폐기한다.

고객 검색/오류 이력과 후보 노출·선택·거절·실제 요청 연결을 별도 사건으로 저장한다. 명시적으로 고른 한 점포에만 ‘못 찾은 니즈’를 남기며 동일 대화의 니즈를 다른 점포로 자동 복제하지 않는다. 공급 조건 미확인·모의 요청 불가·후보 거절·설명 중단·미식별을 구분한다. 원문/대화/모델 상세는 고객 조회, 경영주는 공개 카탈로그와 정확히 일치한 안전 단서와 사유 코드만 본다. 단서가 안전하게 분리되지 않으면 원문 대신 ‘공유 가능한 단서 없음’으로 표시한다. 니즈는 구매 수량/동의가 아니며 승인·회신 의무나 거래 부수 실행을 만들지 않는다.

Locke는 정규화 부가7테이블과 알려진 v1/hash만 허용하는 additive schema2 이행을 구현했다. sourceHash `3d15fce9caf74e0293ce5908bb532cbd3dc69e4639df573b5f76553f1fc72bc0`, seed SHA256 `b8058996893c45b4df9f8e5cd32ece2973ad7a7a3d5dc9399556d01d8a7d8864`. 기존 모든 행·관계·receipt fingerprint/result·시각·보관 이력을 유지하며 저장 실패는 reset 없는 재시도 오류다. 기록 명령은 정산/자동발주/결제/만료 분기보다 먼저 반환한다.

자체 검사: 기존 domain92+needs26 명령/거절, SQL v1형태의 수령 완료/결제/발주 사본의 모든 이전 행·receipt·archive/clock 비교, 지연/실패 이행 저장·재시도·기록 저장 실패 보존 PASS. API dialogue/기존assistant/policy offline 검사·현재 전체 tsc PASS. 조정자는 domain·SQL·dialogue·policy 검사를 직접 실행했다. Node 저장 seam/자체 검사이며 독립 브라우저 장애/최종 자연어 품질 PASS는 아니다. 최초 실패 후 문장 수정으로 같은 대화의 최초 입력이 바뀌던 반례는 Newton이 명시 새 검색 경로로 수정하고 파서 예외도 UI 오류로 처리했다. 기존 `require` 별칭 빌드 실패 패턴은 새 needs helper에 다시 들어온 것을 게시 전 발견해 단순 이름을 `requireRule`로 바로잡았다. 정상 검색·기존 요청/픽업 기능은 삭제하지 않았다. 실제 로컬/Preview 이행·검색·니즈 확인과 새 배포는 이어서 실행한다.

`81a4369`를 분리 checkout에서 Node24 Next build/타입 PASS·클라이언트21파일 실제 키 비포함 확인 후 push했다. `localhost:3101/demo` 실제 v1 수령완료 사본이 새 UI에서 revision6/세대1로 열리고 콜드브루1개·모의결제2,500원·최초픽업09-21 22:53:16/마감09-23 22:53:16·수령22:53:41을 보존했다. 이후 명시 로컬 검색(AI 아님) ‘시연용 미등록 구름별향’으로 검색 이력 저장(rev7)→한 점포 GS25역삼띵동점 니즈 명시 등록(rev8). 경영주 니즈1건 표시·고객 원문 미노출, 기존 예산10,000/사용1,600/잔여8,400원·수령완료 상태 유지 확인. Preview 게시/실제 v2 모델은 아직 확인 전이며 무조건 PASS로 합산하지 않는다.

UI07 배포 `dpl_6NS4AJHqYQ9Nabt4XY9QuMVQnvUm` / https://wanna-lnf9z84uw-d-01.vercel.app/demo 가 Ready이며 전체 SHA `81a4369ec2037886992fbb6869389a27c6df6810` 일치. 실제 Preview의 v1 정책 사본은 revision2/세대1·기존 내 요청1을 유지해 열렸다. 실제 v2 검색1회 ‘콜드브루 커피 300ml 찾아줘’→정확 후보 coffee·원문 근거 이름/300ml·질문0, gpt-5-mini 입력41,177/출력529 tokens·9,295ms. 검색/노출 저장rev4→선택rev5→GS25강남동원점1개/2,500원/새 동의로 요청rev6→추천의 실제 요청 연결rev7. 내 검색 이력에서 원문·근거·사용량·노출/선택/후속 요청ID와 접수순번22를 확인했다. 기존 ST01 요청은 지우지 않았으며 다른 점포 선택으로 SKU 요청을 자동 이동시키지 않았다. 이번 호출로 추가질문·대체·전체 품질가 통과한 것은 아니다. 전체 카탈로그 근거를 전달해 입력량이 커졌으며 후속 제한된 NL 실험에서 품질을 보존해 줄일 대상이다.

다음 구현 후보를 read-only로 확인했다. Meitner: 경영주의 ‘아까 뺀 것 다시’ 적용 문맥, 고객의 MOQ/공급 등 대기 사유, 경영주 실제 모델 실행 이력은 아직 부족하다. Newton: D39 이미지3개를 열람하고 발음 라벨·확인 순서·실제 픽업 가능 상태의 마감 위계 보완을 제안했다. 조정자도 최종 캐릭터 시안을 직접 열람했다. 이는 구현 계획용 읽기이며 독립 UX/전체 요구 검증이 아니다. 현재 모든 agent는 handback 후 쓰기 중단, 사용자 `.idea/`는 보존했다. Production 및 최종 제출/G6는 변경·완료하지 않았다.

## UI-08 고객 대기 사유·픽업 위계 — 2026-09-21

D-46에 따라 경영주 문맥/실행 이력과 분리해 고객 화면부터 작은 Preview로 게시한다. Locke는 기존 도메인 계산을 재사용한 읽기 전용 대기 DTO를, Newton은 8가지 사유/조회시각/공개 모의 최소·포장 조건과 발음 라벨·확인 순서·유효 픽업 마감 강조를 구현했다. 고객 요청 상세의 발주 line에서 매입가·전체 발주/공급 수량을 생략하며 경영주는 기존 상세를 유지한다. 거래 명령·SQL·seed·정책·동의·48시간 기준은 변경하지 않았다. 픽업 전/완료/만료에는 ‘픽업 가능’ 제목을 쓰지 않는다.

자체 domain 거래92/needs26/대기21 검사와 대상 TypeScript/7상태 SSR 확인. 조정자도 `npm run check:domain`과 diff 검사를 실행해 PASS를 확인했다. 실제 브라우저/독립 역할 QA/전체 G5·G6를 대신하지 않는다. `.env.local` 정적 재확인은 CONFIGURED/live not_run 및 Git ignore 확인이며 비밀 값은 출력하지 않았다. 이번 표시 변경 때문에 실제 모델 호출을 반복하지 않는다.

현재 base `81a4369`에 [UI-08 manifest](context/UI-08.md) revision1을 추가했다. SHA256 `6f16f7415ad64ae0003ef2f3c1e15e3255af2426d3634feaf2df82617872f4fe`; 실제 agent에게 인계 ACK를 요청했다. 이전 메시지의 DTO/소유권 ACK와 별개이며 사후 문서화를 과거의 기계 강제 증거로 쓰지 않는다. 자체 검사 후 작은 후보 빌드·비밀값 비포함·푸시/Ready·실제 화면 확인을 이어간다. 전체 goal 검증과 경영주 문맥/로그·최종 데이터/지도 품질은 후속이다.

`e8a5b698186ef61432c296ab409614e59f4c7a33` commit/push → `dpl_wjSQZZkz8VZ3mJpSweEykjS9dvu5` / https://wanna-q0jfsf33a-d-01.vercel.app/demo Ready·source SHA 일치. 정확한 후보의 분리 checkout Node24 Next build/타입 PASS, 클라이언트23파일/커밋12파일의 실제 키 비포함 확인. 로컬 기존 revision8의 수령 완료·니즈 이력을 유지했다. 실제 Preview revision7 기존 coffee/ST01 요청에서 공급 확정 대기를 표시했다. 이후 경영주 모의 공급1개 확정(rev8, 23:47:02 KST)→입고(rev9, 23:47:12)→고객 역할 픽업 화면에서 ‘여기 있GS · 픽업 가능’, 09-23 23:47:12 마감(정확히48시간)을 확인했다. UI08 추가 모델 호출0회. CUA reload1회는 도구 응답 지연 뒤 실제 화면 재조회로 확인했으며, 스크린샷 캡처는 실패해 시각 비교 PASS로 쓰지 않는다.

UI08-P2 복구: Meitner의 독립 좁은 코드 검토에서 A3/B1을 연결한 미확정 발주4 + C2의 별도 확정공급2, A만 동의 만료한 상태에서 B가 ‘공급 확정 대기’로 잘못 표시되는 반례를 확인했다. 원인은 active link 우선 반환이 이미 확보된 잔량/FIFO 전량 충족을 가린 것이다. 조정자가 `wait.check.mjs`에 회귀 사례를 추가해 수정 전 실제 FAIL(actual SUPPLY_CONFIRMATION_PENDING / expected ALLOCATION_PENDING)을 재현했다. 기존 잔량 판정 뒤로 active-link 확인 한 줄을 옮긴 후 거래92/needs26/waiting24 PASS. 조회는 상태를 바꾸지 않고 명시 clock 처리 후 추가 공급 없이 B 예약이 확정되는 정상 기능도 유지했다. 거래/SQL/정책 변경이 아니며 Meitner에 해당 반례만 독립 재확인을 요청했다. 전체 역할 QA나 제품 게이트는 여전히 후속이다.

Meitner가 수정 diff와 waiting24 검사를 직접 실행해 P2 해소·기존 공급대기 보존을 재확인했다. UI08 manifest rev1 hash도 실제 읽고 ACK했으며 소급 증거는 아니다. `af1dce1d5144ba2378d2016ed607edbd965ab51a` 수정 commit은 Node24 Next build/타입 PASS·클라이언트23파일/커밋3파일 실제 키 비포함 확인 후 push했다. `dpl_BgSCAer8nJjyWwy5Bsrz6xm4WWwT` / https://wanna-2lj36g22u-d-01.vercel.app/demo Ready·SHA 일치. 최신 브랜치 실제 브라우저 새로고침 후 revision9·세대1, coffee/ST01의 픽업 가능·최초09-21 23:47:12/마감09-23 23:47:12가 그대로 복원됐다. PR #1은 최신 구현/잔여 범위를 반영한 draft로 유지했고 Production은 변경하지 않았다. 이번 turn은 UI08 두 commit/push·Ready·실제 픽업 증거를 추가한 진행이다.

후속 UI09의 ADR-006 v1을 Newton(제품/범위), Locke(상태/실패)가 서로 의견을 보기 전 독립 검토했다. 예산 키 입력 단위 이력·로그 자체 revision에 따른 제안 만료·정책 성공 receipt·취소/늦은 응답·migration 보존을 v2에 보완하고 둘 다 기보고 반례 해소를 재확인했다. 조정자가 UI09 후보 범위에 adopted로 채택했으며 최종 파일 SHA256은 `f4bf5d3ecc30c47596efd83c7f15cc3bfec192822a188a6804fb157dae37e7f1`이다. 현재 앱에 구현됐거나 품질 검증을 통과했다는 뜻은 아니다. 다음은 공통 DTO 소유자/소비자 ACK를 정한 뒤 경영주 최근 문맥·정책 초안을 먼저 작은 Preview로 연결하고 실행 기록/SQL 이행을 다음 단위로 진행한다. 현재 agent 3명은 편집 없이 handback/대기 상태다.

## UI-09A 경영주 최근 문맥·정책 초안 — 2026-09-21

직전 turn은 UI08 두 commit/Ready·실제 픽업 복원·P2 수정으로 진행했다. 현 branch/head `af1dce1`과 사용자 `.idea/` 보존을 확인하고 [UI09A 계약](context/UI-09A.md) hash `61f40d0f5f8e9878d35455c396d291369fc5ddd455c786d089f88b6b8b534421`을 전달했다. Meitner는 v2 계약/API/helper 단일 작성, Newton은 기존 묶음/정책 UI 소비자, 조정자는 통합/게시다. 영구 실행 로그와 schema 변경은 다음 UI09B이며 최종 요구에서 제외하지 않는다.

운영 감사 UI09A-METHOD-01: Locke가 22/20번·스킬·manifest/ADR hash·UI08 commit/PROGRESS 및 현재 diff를 읽고 관측했다. 기준선은 UI08 두 정확 후보 빌드/Ready와 P2 재현→수정→독립 재확인, 관찰 구간은 이번 DTO 전달 전까지다. 성공 조건은 파일 충돌/허위 PASS/ACK 없는 구현 진행이 없는지 확인이며 1회 읽기에서 현재 UI diff가 허용된 정적 안내뿐임을 확인했다. 처분은 **현행 유지**, 신규 운영 요소·실험/추가 관리자/앱 게이트 선행 없음. index의 한 줄 stale 상태만 다음 문서 갱신으로 바로잡았다. 아직 진행 중인 DTO/새 빌드/배포를 완료로 쓰지 않으며 제품·전체 운영 검증 완료도 아니다. 새 실제 전달 누락/충돌 때만 재개한다.

OpenAI Docs로 2026-09-21 공식 [gpt-5-mini](https://developers.openai.com/api/docs/models/gpt-5-mini)·[Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)를 다시 열어 구조화 출력 지원 및 refusal/incomplete 처리·전체 enum 상한을 확인했다. 모델을 바꾸지 않고 기존 서버 SDK 경계를 재사용한다. 시나리오는 합성 수요3종이 있는 ST04(소보로2/스콘3/토스트1)의 기존 사본을 사용해 reset 없이 준비할 수 있음을 생성된 SQLite seed의 읽기 SQL로 확인했다. 이는 실제 브라우저 실행이나 품질 평가가 아니다.

2026-09-22 KST: Meitner/Newton 모두 manifest hash `61f40d0f5f8e9878d35455c396d291369fc5ddd455c786d089f88b6b8b534421` 및 adopted ADR006 hash를 실제 읽고 ACK, 소유 파일 handback 완료. v2는 64KiB 입력·16KiB 출력 및 최대5개 적용 이력, 카탈로그 전체242개 선택을 지원한다. 합집합 복원과 이전 묶음 한도를 분리하고 현재 선택을 기존 정책 비교/최종확인에 전달한다. 기본 ON/OFF·누적 예산 유지, 두 번째 모델 호출/상품 재입력/자동 저장 없음. 수동 미저장 폼 보존·실제 실행 직전 업무/현재 시각/선택 문맥을 확인하며 부가기록 revision만으로 자가 만료시키지 않는다. SQL·seed·기존 거래 명령은 불변, 영구 실행 기록은 UI09B 미연결 안내를 표시했다.

Meitner 자체 계약/strict TS, Newton 인메모리 hook+mock fetch 자체검사는 독립 품질 검증이 아니다. 조정자는 새 `check:merchant-context`, 기존 policy/dialogue·domain92/needs26/waiting24를 직접 실행해 PASS를 확인했다. stale 선택을 명시 해제/교체하는 정상 지시를 보존했고, 순수 filter도 무관한 stale 선택 때문에 실패하던 반례는 Meitner가 수정 전 FAIL→filter만 좁게 허용 후 PASS로 확인했다. 선택/예산 변경·정책에는 후보/업무 snapshot 검사를 유지한다. 아직 새로운 live·빌드/배포 결과는 없으며 이어서 작은 후보로 게시한다.

UI09A-P2: Newton의 추가 지적과 Locke의 좁은 독립 검토에서 filter 적용 콜백이 빈 한도(남은 예산 자동값)를 숫자로 고정하고 stale 선택 확인을 갱신하는 문제를 확인했다. Newton이 실제 컴포넌트/도메인을 읽는 인메모리 checker로 수정 전 4개 FAIL을 재현했다. 조정자는 action을 콜백으로 전달하고 filter는 uiSeq/조회만 바꾼 뒤 즉시 반환하도록 수정했다. 같은 checker 9개 PASS를 조정자/Newton이 실행했다. UI source SHA256 `1c004122f7a77c40b55bfb0cf6c22987e71edb0c17f65ec7210c1b5b643077f0`, helper `62b2385ead0e86daa417ac8da9f3100f25b9cb973e53b5cf6074b72b64e3b169`. 수정 후 Node24 Next build/타입 PASS, 클라이언트23파일의 실제 키 비포함 확인. `.env.local`은 CONFIGURED·Git ignore이며 정적 검사만으로 goal 준비 완료를 선언하지 않는다. 이번 좁은 복구는 거래/선택/정책 기준을 바꾸지 않았고 브라우저/전체 독립 UX 검사는 아니다.

Locke도 위 최종 UI hash를 직접 읽고 동일 checker9/9 PASS로 그 P2만 독립 재확인했다. `cfda3c90c670597dbfb50dc9325999276a8d753a` commit/push 완료, 게시17파일 실제 키 비포함. Vercel `dpl_9AodSphPaxwBpDMHKZYifFXKzXAB`가 정확한 SHA로 생성됐으며 실제 Preview 확인을 이어간다. 기존 ST04 사본은 화면에서 수동 누적 예산100,000원을 OFF로 확인 저장해 revision10/세대1, 사용0/발주0·수요3종을 준비했다. 초기화하지 않았고 실제 거래/청구가 아니다.

UI09A Preview `dpl_9AodSphPaxwBpDMHKZYifFXKzXAB` / https://wanna-38tb3io8w-d-01.vercel.app/demo Ready·source 전체 SHA 일치 확인. 같은 브랜치 주소의 SQLite revision10/세대1 복원 후 ST04에서 토스트/스콘 선택→스콘 제외→소보로 추가→이번 한도20,000원을 수동 적용(최근5개)했다. 실제 OpenAI gpt-5-mini 호출1 ‘아까 뺀 것 다시’ 입력24,478/출력465 tokens: 토스트·소보로 유지+스콘 복원 초안, 적용 전 선택2종·한도2만원·revision10/발주0 유지. 명시 적용 후3종·합계10,600원, 발주 실행 없음.

호출2 ‘앞으로도 이렇게’ 입력24,486/출력551 tokens: 상품 재입력이나 후속 모델 호출 없이 기존 정책 최종확인으로 전달. 아래 수동 미저장9만원 초안은 전달 시 보존했고, 비교는 저장된 OFF→OFF·누적100,000→100,000원 유지·대상0→3종이었다. 이번 묶음2만원/수동9만원을 누적 예산으로 복사하지 않았다. 명시 AI 정책 저장 후 revision11·OFF·대상3종·예산100,000/사용0/발주0. 실제 새로고침 후 동일 정책·revision/세대·기존 이력 유지, 단기 최근 변경0/5·선택0으로 종료 확인. 신규 모델 호출 총2회이며 정확한 API latency 계측은 이번 UI에 없어 기록하지 않는다.

실제 응답 문구에는 내부 SKU 표기와 ‘활성화/예산을 지정해 주세요’ 같은 불필요한 추가 지시 표현이 관측됐다. 코드/최종확인 화면은 유지값과 미저장 상태를 명시하며 추가 입력을 요구하지 않았지만, 이를 전체 자연어 품질 PASS로 취급하지 않는다. 후속 NL 실험/카피 검사에서 문구 품질과 입력 약24k 비용을 함께 개선한다. UI09A는 좁은 정상 흐름 관측이며 독립 두 역할 UX·전체 G5/G6·Production은 여전히 후속이다. 다음 UI09B는 영구 실행 기록/SQL만 분리해 진행한다.

## UI-09B 경영주 AI 실행 기록 — 2026-09-22 KST

목적: CORE-05/06/23/25/26·ADR006 규칙6~8의 시도/종료·관측 응답·실제 적용을 구분하고, 성공한 정책을 기록 오류 때문에 재실행하지 않는다. UI09B manifest `7de64a401f53af892ca7ff451c21cf6342591624c73a535f1b82403c7e9d8136`, DTO `6da2f617337f929854db9cdc64bcd6fcf25e06691e73376b9d7b6922a060e0a7` 실제 ACK 후 Locke(domain/SQL)·Newton(UI) handback, 조정자가 어댑터/페이지 통합했다. 모델 API·프롬프트·거래 정책은 유지한다. 전체 goal 검증을 Preview 선행조건으로 추가하지 않았다.

두 AI 입력 경로에 시작/종료·늦은 응답·화면 적용/정책 receipt를 연결했다. 저장 오류는 명시적 ‘미저장 AI 기록만 다시 저장’으로 처리하며 모델/정책 재호출이 아니다. 기존 거래 busy와 부가기록 저장을 분리하고 알려진 schema1/2만 additive schema3으로 이행한다. sourceHash `b665391bac2a443ae0a42f850828e3c0ceaafaad4c9f7c8058c1b67453f24051`, seed SHA256 `02028bb5e30d0c4b933d429a15c0da1af26a705783619eb616894f4feaa4b445`. 시작 로그 실패→정책 C 성공→이후 로그 재시도도 허용하며 C receipt 원문·거래/시계를 보존한다.

조정자 실행: `check:merchant-trace` trace58·client queue·실제 sql.js 실패 시작 로그/C/복원·UI helper13 PASS. `check:domain-store` v1/v2 모든 이전 행/receipt/search/archive/clock 보존·저장 실패 후 reset 없는 재시도·unknown/corrupt 거절·FK/CHECK·정상 거래 PASS. 독립 needs26/waiting24 PASS. standalone checker의 transitive 순수 계약 import를 위해 resolve hook 범위만 `/lib/`로 맞췄다. 모두 합성 입력/Node 저장 seam이며 실제 모델/브라우저 실패 주입과 구분한다.

UI09B-P2(계약/순차 저장): Meitner의 읽기 전용 검토에서 경영주 로그 직후 고객 요청의 cached revision이 낡아 같은 명령 재시도가 계속 실패할 수 있음을 발견했다. 조정자 소유 app/demo/page.tsx에만 연결된 작은 고객 저장 helper를 추가했다. 실제 SQL 최소 재현은 명시 고객 actor 누락 fixture를 바로잡은 뒤 수정 전 STALE/assertion FAIL, 수정 후 PASS. 확정 STALE·receipt 없음·동일 세션/세대의 신규 고객 요청/부가기록에만 1회 revision 재시도를 허용한다. 동의/가격/조건 version/명령 키는 그대로이며 실제 domain이 다시 검증한다. 재시도 전 exact command를 cache하므로 결과 불명확 시 다른 명령을 만들지 않는다. 조건 변경은 거절, 정상 요청/같은 receipt 재전송은 단1건, merchant/이전 세대/불확실 결과는 rebase하지 않는 검사 PASS. 기대값/제품 정책 변경 없음. helper hash `64bbd0c2a374f8f857c233e3f94fa2ef44b3d5e31e3cbfabcb1d99973714347b`, page `c9d6ec759ab8315799322807dba0d36dbc232c52de4f63b688ae288b7ba6f5b5`.

Meitner 독립 재확인: 위 exact helper/page hash와 checker `dbd187bc6c44a7bce077de196d312cb6817fd14f51e0bc5cd07e491c3189c1f1` 검사 전후 일치, `check:customer-write` 직접 종료0·P2 해소. 좁은 코드/실제 SQL 검토이며 브라우저/live/전체 QA는 아니다. 최종 후보 Node24 Next build/타입 PASS, 클라이언트23파일·staged25파일 실제 서버 키 비포함 확인. 실제 Preview migration/두 입력 경로 호출·복원은 게시 후 확인한다. 전체 독립 UX·최종 데이터/eval·GATE-BOOTSTRAP·G5/G6·Production은 아직 미실행/미완료다.

`9e2b6bfd116929e56b9d3735bccdec6ff1ba99c2` commit/push → Vercel `dpl_CtaqnehhSBF1gNGiTiuoUNysYigK` / https://wanna-7hk3pq5l9-d-01.vercel.app/demo **Ready·source SHA 일치**. 같은 브랜치 주소를 실제 새로고침해 알려진 schema2 사본을 schema3 앱에서 복원했다. revision11/세대1·내 요청2건·보관이력·ST01 커피 픽업 최초09-21 23:47:12/마감09-23 23:47:12가 유지됐다. ST04 OFF·누적100,000원·대상3종·발주0도 유지했으며 reset하지 않았다. 모든 행 보존은 위 SQL 검사, 이 브라우저 관측은 화면에 보이는 대표 기존 기록의 보존 증거다.

UI09B live는 정확히2회, gpt-5-mini/서버 OpenAI 경로다. (1) ‘미확보 요청만 보여줘’ 입력24,177/출력261 tokens, UI 계측4,028ms: 시작/성공 로그 저장 후 revision13에서도 제안이 자가 만료되지 않음. 명시 적용 전 ‘아직 적용 안 함’, 적용 뒤 ‘화면 변경안 적용’/revision14·대기 조회·발주0. (2) ‘앞으로 누적 매입 예산을 9만원으로 바꿔줘’ 입력23,744/출력239 tokens, 4,918ms: OFF/대상3종 유지·100,000→90,000원 제안, 별도 최종확인/명시 저장(C) 후 정책 저장 기록(L), revision18. 이는 종단 UI 처리 시간이며 provider 전용 latency라고 주장하지 않는다.

실제 새로고침/역할·점포 선택 후 ST04 AI 기록2건의 각 입력·종료·관측·화면적용/정책저장 상태와 저장 시각 복원 확인. OFF·90,000원·대상3종·사용0·발주0, 선택0·빈 이번 한도 유지. ST01에는 ST04 실행 기록이 노출되지 않았다. 실제 저장 장애/취소·늦은 응답 브라우저 주입은 이번 두 정상 경로에서 하지 않았으며 Node seam 결과와 분리한다. browser selector 한 건은 role 없는 정책 컨테이너를 region으로 조회해 timeout됐으나 화면 자체 오류는 아니며 현재 AX를 읽어 정상 진행했다. 전체 독립 UX/시각 스크린샷 판정은 후속이다.

이번 turn은 UI09B 구현·P2 재현/최소 복구·정확한 Ready·실제 모델2호출/로그 복원으로 진행했다. 소유권 반환된 기존3에이전트는 종료했다. 사용자 `.idea/`와 `.env.local`을 보존하고 Production은 변경하지 않았다. 다음은 지도 정상 렌더와 데이터 사실 보강을 작은 단위로 진행한 뒤 전체 goal 검증/CI·평가·독립 두 역할 QA·최종 제출까지 이어간다. 이 두 live 사례로 전체 품질이나 goal 완료를 선언하지 않는다.

## UI-10 지도 fallback · DATA-02 병행 — 2026-09-22 KST

직전 turn은 UI09B 실제 배포/복원으로 progress였다. 현 HEAD `9e2b6bfd116929e56b9d3735bccdec6ff1ba99c2`·branch·사용자 `.idea/`와 후속 증거 docs3파일을 확인했다. [UI10/DATA02 계약](context/UI-10-DATA-02.md) hash `2a45dcd6cea95ad2b0d4962b93cf1239b1f36ec028a5d4e0c09dbc569b74db0d`: main 지도, Singer 상품 조사, McClintock 점포 근거, Avicenna 좁은 지도 독립 검토. 연구 파일과 지도/공유 docs 소유를 분리했다.

UI05 지도 지연 재진단: [공식 OSM 공유 iframe](https://wiki.openstreetmap.org/wiki/Export)과 [타일 정책](https://operations.osmfoundation.org/policies/tiles/)을 다시 직접 읽었다. 같은 공개 지도 URL의 HTTP HEAD는200이며 웹사이트 iframe 삽입 자체가 지원된다. 기존 앱 탭2에서는 다시 12초 timeout/iframe 제거가 관측됐다. 별도 공식 지도 탭6에서는 컨트롤/마커가 나타났고, browser visibility를 켠 뒤 실제 타일/마커 스크린샷을 확인했다. 서버200이나 iframe load만을 정상 지도 증거로 삼지 않는다.

기존 앱 탭2를 닫고 보이는 탭6에 같은 Preview 사본을 열어 revision24/세대1 보존 확인. 로컬 예시(실제 AI 아님) 우유 검색/선택과 ST01 명시 선택 후 iframe DOM 내부의 지도·마커·확대/축소가 표시되고 실제 확대 버튼이 동작했다. 추가 검색/후보 사건으로 revision27이며 구매 요청/동의/발주를 만들지 않았다. 앱 페이지 전체/지도 clip 캡처는 계속 실패했다. 공급자 단독 시각 증거와 앱 DOM 동작을 분리하며 앱 지도 시각/전체 UX PASS를 선언하지 않는다. 환경/표시 상태와 외부 load에 영향을 받는 것으로 관측했으나 최초 timeout의 단일 원인은 확정하지 않았다.

최소 개선은 새 SDK/타일 프록시·timeout 증가 대신 **같은 검증된 공개 점포 iframe URL을 명시 새 탭으로 여는 링크**다. 기존 iframe·주소/목록·선택/동의·거래는 유지하고 외부 연결 설명·지연 안내·키보드 focus만 보완했다. ADR004의 기존 단일 선택 점포·같은 공급자 fallback 구현이며 새로운 고객 정책/좌표/개인정보 전송이 아니다. `check:store-map` 기존8점포/좌표/URL 검사와 실제 React 정적 markup의8개 정확한 링크·noopener·기본 Referer·명시 동작 전 iframe 없음·미확인 점포 링크 없음 PASS. Node24 Next build/타입 PASS. 모델 호출0회이며 실제 브라우저 새 링크 클릭/Preview는 이어서 확인한다.

data 연구는 첫12분 이내 확보 근거를 인계하도록 제한했다. 현재 catalog·SQL·seed는 변경하지 않았고, recent20~30/원배포·좌표/최종 데이터 검증 완료로 보고하지 않는다. 전체 goal 게이트·Production은 후속이다.

`65765f77cd19811f85cacfecba2272562e7dd9ac` commit/push → `dpl_BhAfzvaSoxDuwv3dcxCEJECLM1G7` / https://wanna-lspa25j3p-d-01.vercel.app/demo Ready·정확한 source SHA 확인. Avicenna는 독립 좁은 검토에서 실제 `check:store-map`을 실행해 PASS, 같은 URL·명시 클릭·noopener/Referer·동의/거래 불변을 확인했다. 대상 hash: component `1abebc0e8d2857897dbfc1e0ab83e9280ae07828097329a591f9d3c2d11e0478`, CSS `d2018f93526988f58c8a9ca3cd1e04626e323912493527139be6bd76662294f9`, checker `6993920deb7ede9648f48421fefb6db6af9a240952ec96dd5f1adb353e537401`. 전체 UX/시각 검토가 아니다.

새 Preview 실제 reload 후 SQLite revision27/세대1·기존 내 요청2/이전 보관1 복원. 로컬 우유 검색·선택만으로 revision30, ST01·2,800원·동의 미선택 유지. 새 링크의 href가 같은 공개 점포 좌표임을 읽고 클릭해 탭7 `OpenStreetMap Embedded`의 마커·확대/축소·attribution을 확인했다. 탭 열기는 실제 성공했으며 캡처는 실패해 앱/새 탭 시각 QA PASS로 세지 않는다. 확인 뒤 임시 지도 탭만 닫고 Preview 탭을 남겼다. 추가 요청/결제/모델 호출은0이다.

## DATA-02 데이터 반영 시작 — 2026-09-22 KST

Singer의 [최근 상품 연구](research/goal-20260922/recent-products.md)는 직접 열람14출처/후보24/공개 dev family11개다. 규격3확인·21미확인, 기존 이름3중복, 미래9/28품목1을 분리했고 독립 검토·앱 반영 전이다. McClintock의 [점포 근거](research/goal-20260922/store-evidence.md)는 공식 이름/주소8개·기존 좌표 원문7개를 재확인했다. ST06 과거출처404·원배포/재사용조건 일부미완료·출입구/현재영업 미확인을 보존한다. 두 연구자는 파일 인계 후 종료했다.

조정자도 공식 GS25 공개 검색4개를 일반 HTTP GET으로 읽어8개 이름/주소/별도 좌표를 직접 대조했다. 각 응답SHA256은 점포 보고의 SE-GS-Y/S/D/E와 정확히 일치했다. 웹 텍스트 도구의 접근 실패와 실제200 응답을 분리한다. 현재 좌표를 공식 값으로 자동 교체하거나 CRS/라이선스 보증으로 승격하지 않는다.

[DATA-02 앱 반영 계약](context/DATA-02.md) hash `9eb472380f9de497ecfbe315d41532b6dfa8f97e05dcff83de2ab15f4456ab80`: Boyle 단일 data/SQL 작성, Herschel 독립 상품 사실 검토, main 화면 예시/통합/배포. 기존 중복3·미래품1 제외 최대20개를 기존242개 뒤에 추가하는 후보이며 확인 부족 항목은 보류한다. 기존 상품 정체성·484조건/동의version·모든 거래/receipt/로그/시각을 보존하는 알려진 snapshot 이행을 함께 준비한다. 이행/독립 검토/빌드/새 Preview는 아직 실행 완료가 아니다. 전체 goal 검증을 선행 차단하지 않으며 Production은 그대로다.

인접 소비자를 확인해 같은 catalog를 쓰는 이전 `/` Preview와 고정242개 표기도 영향을 받음을 확인했다. 계약 revision2 hash `388076db14d9c4a71c13f41dd1b0f6364dc6a61222578a23ed26de73e9c330e1`로 이전 schema2/hash의 요청 보존 이행·관련 checker를 같은 데이터 작성자에게 추가하고 두 agent에게 실제 재읽기/ACK를 전달했다. main은 고객 예시2개(RP007/017, 공개 dev F02/F06)와 이전 화면의 실제 catalog 카운트·stale 주석만 수정했다. 이 예시 변경은 아직 미게시이며 입력만 채우는 기존 버튼/되돌리기 로직은 변경하지 않았다.

Herschel [독립 사실 검토](research/goal-20260922/data-review.md) hash `621d8dc60c8fada9b28a29687eb5f756596f2b63af6baa98ca13e30e0e33e5f9`: 직접 본문8출처를 열고20개 이름/형태를 지지, 기존242명칭/704별칭과 전체 신규명 중복0을 확인했다. 단 RP010의9/3은 발표일이며 정식 출시일은 미확인으로 고쳐야 한다. RP011의9/1은 시제 혼재를 명시한다. 작성자에게 이 사실 수정과20개 용량null 유지를 전달했다. 연구 원본은 당시 기록으로 보존하며 최종 생성본·SQL·브라우저 PASS로 확장하지 않는다. reviewer는 revision2 실제 ACK 후 인계/종료했다.

배포 전 실제 기존 `/` 사본은 내 요청1건: `데모 들깨버섯밥 도시락 320g`·GS25역삼미래점·1개·1,200원·동의함·요청 접수 상태로 확인했다. `/demo`는 revision30/세대1·내 요청2/보관1 기준선이다. 초기화/추가 거래/실제 모델을 호출하지 않았다. 다음은 Boyle handback→좁은 독립 SQL 보존 검사와 main 빌드/소비자 검사 병행→작은 commit/push·Ready→동일 주소의 기존 두 사본/새 상품 검색 확인이다. DATA02는 아직 구현 중이며 현재 사용자에게 공유된 Ready는 UI10 `65765f7`이다.

## DATA-02 후보 통합 — 2026-09-22 KST

Boyle은 revision2 실제 읽기/소유권 ACK 후 20분 이내 인계했다. 20상품·40모의 조건 추가로262/524이며 기존242상품 전체 필드·484조건 값/version은 동일하다. 새 규격은 모두null, RP010 발표일/출시일과 RP011 시제 혼재를 생성 자료에서 정정했다. 점포 좌표는 유지하고 근거만 추가했다. schema3/sourceHash `88f9d52f3a8dea7fa72e2f058b4c2ac3e90c0a6c5de4a60f2963437aa49f1672`, 이전 `/` schema2/hash `956e0d1c3841360408ef302813010fb96f961fbc2b159888fa6658154d464eb1`. 기존 알려진 사본만 추가 이행하며 저장 완료 전 공개하지 않는다. 자체 검사는 실제 과거242/484 데이터와 원래 seed bytes를 복원해 거래/receipt/로그/시계/조건 수정값·실패/재시도·재열기를 검사했다. 작성자 자체 PASS와 독립 판정을 구분한다.

통합 중 전체262상품 정책 입력4,284B가 기존4KiB HTTP·실행 기록 한도를 모두 넘는 실제 회귀를 재현했다(RED: BODY_TOO_LARGE / INVALID_MERCHANT_TRACE). 정책 전용 공통 상수8KiB를 route와 기록 파서에 함께 적용했다. 전체 대상 그대로 보존·한글300자·정확히8,192B 허용/8,193B 거절 GREEN. strict 필드/허용ID/301자 거절·최종 승인·모델 출력 한도는 유지한다. 기본/기존 merchant4KiB, search의 기존8KiB, batch64KiB는 변경하지 않았다. 단순 고정 상품 수 검사 갱신과 이 실제 런타임 복구를 구분한다.

Lagrange 독립 검토는 Node24 정책 checker·trace61을 직접 실행하고, 별도 메모리상 옛 제한 재현 및 거짓 Content-Length·한글/초과/추가 필드/외부·중복ID를 검사해 좁은 PASS. manifest/card/CORE/결정/verify/recovery 실제 ACK를 받았다. 대상 hash: policy route `d38a7c994e6ee18dd21fd44c2e1d04eb7f93dd352992329cb30ed40b482add86`, 계약 `a47374ec8fa771ff32191157767aa7536850961a74a64f7b3ffab5594d516e18`, checker `5596e8bb6e2eb20de6fb5222fe432ffa4c65b0f1fd54460ca45b29cfda18015a`, trace `f264ba92312717a0d966774b25aa77bdb628c2f7e81accd1ee0e7c36da247819`, trace checker `ab04eaa8c1d10fb310c36c9331ef1ace996478a123e1dbc50c63d005a182cd7f`. SQL/브라우저/live/전체 QA 판정은 아니다.

main 실행: Node24 `npm run build` Next15.5.25·타입 성공. `check:merchant-trace` pure61·client queue·실제 sql.js 로그실패/receipt/복원·UI13 PASS, `check:customer-write` 실제 SQLite 로그→고객 요청/중복 receipt·조건변경 거절 PASS. 앞선 dialogue/policy/merchant-context 소비자 검사도262개를 사용해 PASS, 실제 모델 호출0. `.env.local` 존재·키/모델 설정·live 여부만 boolean으로 확인했고 비밀값은 출력하지 않았다. Helmholtz는 별도 read-only SQL 이행 검토 중이다. 전체 goal/최종 데이터 QA·Production은 미완료이며 작은 Preview 공개 후 실제 저장 사본/검색을 확인한다.

Helmholtz 독립 SQL 검토 인계: 실제 Node24 전용 checker 종료0·diff check PASS. 별도 메모리 반례에서 요청0건·ON정책·revision73/generation9/nextSequence412를 보존했고 조건INSERT 오류 주입 시 저장0회·원본 불변·재시도 성공을 확인했다. manifest/card/CORE/index/verify 실제 ACK. hash: generator `749cab3db308880ce07d1cc7b988d123799d1ebf46dd52bb2be65228e4e88f61`, domain storage `57592ac364eea8478b48d233dbb700ff7a84358560854fc4a46660b1f37bc551`, preview store `4822623c94aef71a5be6f2c5a1f9ba47b75da8fb0efdd791b291ce421e956aa4`, DATA02 checker `6a11148969c2ecf0b1a255e8e5df3b84cd2fc6ff3fbba448d30def56aac578a3`, domain seed script `e36070956969f348a6b8abaeb1f360a82f9d3a14e39161c1bf1e58adb79e6f69`, preview seed script `e35cf31cc9208de2355315af5b5aa8cd0068cbf817533446226e3d86b4bdc691`. 이행 한정 PASS이며 브라우저/모델/전체 데이터 검증이 아니다. 클라이언트23파일·staged27파일에서 실제 서버 키가 없음을 확인했고 `.env.local` ignore·사용자 `.idea/` 미포함을 확인했다. 두 구현/검토자는 인계 후 종료했다.

`25e1e9d71583655679a3fb3dd91ad2cf79accecd` commit/push → Vercel `dpl_GWKTNkPWqkH2ZwMEbuLYSUKiyW9D` / https://wanna-3laa9hhbf-d-01.vercel.app/demo **Ready·source SHA 일치**. GitHub의 Vercel status success는 배포 검사이며 아직 `.github` 실행기/전체 CI 게이트는 없다. 같은 브랜치 주소를 실제 reload해262상품·새 예시2개·revision30/세대1을 확인했다. 기존 고객 내 요청2·보관1, ST01 커피1개/2,500원·픽업 최초09-21 23:47:12/마감09-23 23:47:12 유지. ST04 정책OFF·누적90,000원·대상3종·사용0·발주0, 기존 AI 기록2건의 화면적용/정책저장 상태도 유지했다. `/`의 별도 사본은262개로 이행되고 들깨버섯밥320g·ST03·1개/1,200원·동의함·요청접수1건 그대로다. 저장 오류/초기화/재삽입/자동발주 없이 화면에서 관측했다. SQL 전 행 대조와 이 대표 화면 관측을 구분한다.

새 RP007 예시 버튼은 입력만 채우고 되돌리면 빈 입력으로 복원됐으며 revision30은 유지됐다. 이어 실제 AI 검색을1회 시작했다. 모델 결과/새로고침 기록 복원은 다음 관측에 기록한다. Production은 변경하지 않았다.

DATA02 live1회 완료: ‘라라스윗 그릭 복숭아 쫀득바 찾아줘’ → 새 상품 정확 후보1개·추가 질문0. 화면에 규격/현재 판매·재고·인기 미확인과 모의 가격2,600원이 표시됐다. gpt-5-mini 입력44,672/출력509tokens, UI 종단9,367ms(별도 provider latency 아님). 후보 선택 후 ST01/ST04 요청 가능한 모의 조건·다른 점포 조건 미확인·동의 미선택/요청 버튼 비활성 확인. 새 요청/결제/발주0, 검색/노출/선택 기록만 revision30→33. 실제 reload 후revision33/세대1·새 검색 원문/정확 후보/사용량/시간/노출·선택 이력과 기존 요청2/픽업 마감 복원을 확인했다. 1개 공개 dev 정상 사례이지 보호 holdout/전체 자연어 품질 PASS는 아니다. 큰 모델 입력량은 후속 제한된 최적화 대상이다.

이번 turn은 실제 데이터/화면 게시·정책 크기 회귀 복구·SQL 독립 검사·같은 origin의 저장 사본 보존·실제 새 상품 검색으로 진행했다. 사용자 `.idea/`·키·Production은 보존했다. 다음은 D-39 화면 참고/남은 가시적 UX를 작은 배포로 정리한 뒤, ADR-002 두 검토 및 실행 가능한 CI/평가·두 역할 독립 QA·G5/G6·최종 제출을 진행한다. 미완료 항목을 현재 좁은 PASS로 대체하지 않는다.

## UI-11 입력 우선 화면 — 2026-09-22 KST

[UI11 계약](context/UI-11.md) revision1/hash `50cb496ffef977fbd99c622c6cbab3c14880cf3951b73a85d3d689a262b6ed7e`. D-39 최종 참고 그림을 실제 열람하고 시안/블루·흰 카드·명확한 입력 위계를 적용했다. Aristotle는 고객 JSX/CSS/checker만, main은 공통 안내/고객640px 폭·하단 저장 도구/게시를 담당했다. 새 라이브러리·API·SQL·상품/거래/동의 정책 변경은 없다. 검색 입력·CTA 앞의 반복 안내를 줄이고 모드·대화 도움/자료 안내는 native details로 보존했으며 실제 AI/로컬 구분·설정/검색/기록 실패·질문/재시도는 접지 않았다.

Erdos 독립 검토: Node24 실제 React markup7 PASS, 별도 AST로 고객27/demo12/이전 Preview8 이벤트 바인딩 불변 확인. 하단 초기화 버튼의 확인 영역이 위쪽에 남은 P2를 발견해 main이 기존 JSX를 단일 resetPanel로 추출하고 버튼 뒤에 배치했다. !state 복구는 기존 위치다. 재검토8상태 PASS, demo/page hash `86cc1fa31d4c46fa7b20eae6091d9f94b8068dcc324c047f033ea64f3c965cef`. 실제 브라우저에서 확인창 열기→Tab이 확인 버튼으로 이동→취소까지 관측했고 실제 reset/삭제는 하지 않았다.

로컬 Node24 dev/실제 브라우저 DOM: 390×844에서 입력 y617.18~727.18·CTA y791.98~843.57, 이전 배포의 입력 y1336.08보다 앞이다. 360×800에서 입력 문서좌표 y637.78·CTA y834.98, 가로 scrollWidth360. 360px는 CTA가 첫 viewport 아래이며 첫 화면 전체 시각 PASS라고 주장하지 않는다. 모드 도움 열기→명시 로컬 전환→RP007 예시 입력만 채우기/되돌리기→상품명 검색/키보드 후보 선택→ST01 선택, 2,600원·동의 false/요청 disabled·48시간 안내 유지. 검색/선택 기록 후 revision5/세대1, 새 구매 요청·결제·발주/모델 호출0. 두 마우스 도구 timeout은 실행 불확실로 기록하고 현재 DOM을 다시 읽어 키보드로 진행했다. 캡처/200%/전체 독립 두 역할 UX는 후속이다.

main이 customer-layout7·실제 SQLite customer-write 인접 검사 및 diff check를 실행해 PASS. 전용 dev server만 정상 종료하고 production build를 시작했다. `.env.local` ignore·기존 실제 설정 증거와 사용자 `.idea/`는 보존한다. 전체 goal 검증을 UI11 게시 선행조건으로 만들지 않는다.

동시에 ADR002에 대한 Ptolemy 제품/eval·Planck method/state 독립 보고가 도착했다. 아직 proposed이며 holdout 선소비/분모·UX 부담/호출 상한 등을 보완·재ACK 후 채택해야 한다. Planck가 추가로 발견한 정책 UI의4096B와 API/trace8192B 불일치는 다음 별도 작은 수정 대상이다. 이번 화면 변경으로 그 미검증 경계를 PASS로 승격하지 않는다.

UI11 Node24 production build/타입 PASS. `.env.local` 재확인 CONFIGURED(live 재호출0), client23/staged10파일에서 실제 서버 키 미포함·개인 `.idea/` 제외 확인. `e2450fdb9abcd19caaf78c53ba8ce8379059286d` commit/push → `dpl_51aCLpBJL8qpi4d3kNZr2ycqCwin` / https://wanna-ecy1jsxg8-d-01.vercel.app/demo Ready·source SHA 일치. 같은 브랜치 origin을 실제 reload해 모바일390×844의 입력617.18/CTA843.57·scrollWidth390, 내요청2·보관1·revision33/세대1·실제AI 설정 표시를 확인했다. 경영주 역할 전환 시 기존 상단 저장 도구/점포/묶음/고객 상세 접근 유지. 1280 override 요청은 실제390으로 관측돼 데스크톱 QA로 세지 않는다. 스크린샷 실패는 그대로 남기고 viewport override 해제·고객 화면으로 복귀해 사용자에게 Preview를 공개했다. Production 변경 없음.

## POLICY-01 정책 화면 입력 크기 — 2026-09-22 KST

[POLICY01 계약](context/POLICY-01.md) hash `2ee8b64bf91f53808549484178493b183d71f3ca4f9d0f5ce4aafc003929d77a`. 코드/통합 P2이며 새로운 정책 공백이 아니다. 원래 유효한 전체262대상 정책도 자연어 변경안을 받아야 하는 CORE05/06/23/25·ADR003/006 목적을 유지한다. main이 policy-assistant.tsx의 상수 import와 비교2줄만 수정했다. 공통8192B 계약/API/trace는 그대로다. 출력·명시 확인·정책 저장·동의·SQL/seed/모델은 변경하지 않는다.

Schrodinger는 새 `policy-request-ui.check.mjs`만 작성했고 자체 Node24 실행 후 인계했다. 실제 TSX propose를 AST 추출해 같은 parse/응답 계약으로 실행하며 transport/trace만 stub한다. 메모리상 옛4096은 실제262대상+한글300자5,159B를 거절(RED), 현재코드는 전체대상 보존/예산 변경 제안 GREEN. 한글301자/빈입력/외부SKU는 fetch·trace0, 별도 합성catalog로 정확8192B 전송/8193B 선행거절, 모든경우onSave0·confirmedfalse. 실제 live/browser 실행 증거가 아니다. main도 같은 checker/API policy/trace61·diff check PASS, build 진행. checker hash `e904c6457d7c1eecf39b8d66c4004ced022e15648a020b28d8554eb768c62163`, component `7352796d674f9686be128a40e56202ab4b974c24fdacf9dda4bca4818fd8bdb6`. Planck의 독립 좁은 재검토 후 별도 commit/push하며 UI11 공개는 기다리지 않았다.

Planck 독립 코드 판정: 같은 component hash에 대해 실제 callback RED→GREEN/8192·8193B/전송 전 거절·명시 승인 경로 보존 좁은 PASS, 게시 차단 의견 없음. main Node24 Next production build/타입 PASS, client23/staged5파일에서 실제 키 미포함·개인파일 제외 확인. 소비자 API `d38a7c994e6ee18dd21fd44c2e1d04eb7f93dd352992329cb30ed40b482add86`, trace `f264ba92312717a0d966774b25aa77bdb628c2f7e81accd1ee0e7c36da247819`, UI 위hash가 공통계약 `a47374ec8fa771ff32191157767aa7536850961a74a64f7b3ffab5594d516e18`의8192B를 사용한다. API/trace 기존검사와 UI실제callback 검사를 구분하고 전체브라우저/live/모델품질PASS로 확대하지 않는다. METHOD-VERIFY01-01은 별도 사전 독립승인을 받지 않았으므로 이번 복구를 그 운영시험 PASS로 소급 표시하지 않는다.

POLICY01 `3f6420b887ad97e344608b5521f8f00141e75204` commit/push. 별도 ADR 검토를 기다리지 않고 배포를 시작했다. Planck는 추가로 실제 save callback의9개 경계를 메모리에서 실행해 미확인/변경없음/disabled/thinking/lock/stale/정책version 변경은 onSave0, 명시확인 정상만 mock onSave1과 OFF/262대상/8만원/revision/명령키 보존을 확인했다. React mount/실DB/실브라우저 성공으로 확대하지 않는다.

Vercel `dpl_5LkJtU6xrJhoTd4qvupF4qBY1Yqq` / https://wanna-l8wbnq8l6-d-01.vercel.app/demo Ready·정확한3f6420b SHA·GitHub Vercel status success 확인. 같은 브랜치주소 실제reload 후 입력우선 화면·실제AI 설정·내요청2·revision33/세대1 유지. 이번 수정의 최대262대상 전송/저장은 browser/live로 실행하지 않았으며 callback/API/trace의 좁은 증거만 있다. Production 미변경, 새live0회.

## VERIFY-01 평가 기준 채택 — 2026-09-22 KST

기능·Preview 우선 진행 중 별도 정책 검토를 수행했다. Ptolemy(제품/eval)와 Planck(방법/실행)의1차 보고를 독립 작성한 뒤 main이 ADR002 revision2로 보완했고, 같은 정책 본문 hash `1f57a93515ebc0893ab9c14eb473d884116093901e97fcd7b491398bac2b0c16`에 대해 두2차 ACK/채택 권고·새P1/P2없음을 받았다. 보고서 최종hash는 제품 `75f986cab874c42d6cb97ee4c7b8269f7645025a78a9f38cabeb2265378422e5`, 방법 `06e1d9b66974560c391771e3f1d7cf80362f20b0f609439d4f0492c92e654090`. 조정자가 채택 메타데이터/효력·index·21/23·작업상태를 동기화했다. 정책 본문 문턱을 실제 결과에 맞춰 바꾸지 않았으며 고정baseline은 아직 없다.

핵심 보완: baseline dev+validation/선정후 보호holdout·case/turn/attempt 분리; 고정전체분모/미실행과transport실패·정상절반/각slice분리; SKU/속성/scope/상태oracle·전체UX부담; 선언요인 외 동일조건/경계재비교1회; 현SDKretry0·층별timeout·실행전 수치비용상한/unknownusage; 실제CI 미구현·Production 비활성 구분. 고객300/경영주120·95/90/85%·불변식0·후보6/6·연속비개선3회 유지. 판정은 최종 검증 **기준 채택**이며 전체 QA/비용 승인/CI 강제/PLAN-READY/G5/G6 PASS가 아니다.

이번 turn은 UI11 실제 공개·POLICY01 소비자 회귀 수정/게시·ADR002 두 관점 보완 채택으로 진행했다. Production/키/사용자 `.idea/` 보존. 다음은 기존 체크를 잇는 최소 GATE-BOOTSTRAP/CI와 버전별 평가·독립 두 역할 QA를 준비한다. 대규모 API 평가는 수치상한·권한 경계 확인 전 실행하지 않는다. D-46의 작은 변경/Preview 공유와 최종 목표의 필수 완료 조건을 함께 유지한다.

## GATE-01 실제 offline CI 연결 — 2026-09-22 KST

직전 goal turn은 UI11/POLICY01 배포·ADR002 채택으로 progress였다. 실제 HEAD `6db1d9bebf8db4647117cf4cbea2d0caefefbdb2`·사용자 `.idea/`만 untracked를 확인했다. 문서 commit의 Vercel `dpl_5VAjJSZKXHQBnpbyiT8sBe8F7ehH` / https://wanna-8zmty0cuh-d-01.vercel.app/demo Ready·source일치 재확인. 기존 구현/연동을 처음부터 다시 preflight하지 않았다.

[GATE01 계약](context/GATE-01.md) hash `7c806224dbcdbd6cc00a6967dda3d210d4c118ad4f1ef4a9378efec43beecc70`: main 실행기/CI/package/.nvmrc, Curie registry, Hooke 독립 검토. Node24.12.0 고정·새 의존성/lockfile 변경0·API키 없는offline경로다. Curie는 기존검사 최종완료신호·순서/제약을 읽어21개를 등록하고 인계에서 누락된 inspector unit 및 새validator selfcheck2개를 보완해23개·23완료suite로 반환했다. 반환hash `e534263c12c122e944ff053bf6117c8461c99b7ceb2c351e977f833de6020ac4`. 완료suite 수와assert/상품/내부사례 수는 다르다. DATA02 과거Git object 때문에 checkout fetch-depth0을 사용한다.

`scripts/quality.mjs`는 실제 shell없는argv 프로세스·완료marker/exit/signal/timeout·원본loghash·현재HEAD/소스fingerprint·시각을 별도실행 폴더에 기록한다. 실패해도 나머지offline집합과build를 수행한 뒤aggregate판정한다. 실패/zero/skip/누락/중복/변조log/stale/실행중drift·unsupportedlive/G6 phase를 거절한다. unsigned로컬파일의악의적위조방지까지보장하지 않는다. G1~G6/독립QA/live 증거 검증기는 아직 별도 후속이며 이offline결과로 출시를승인하지않는다.

main 실제실행: `check:quality` 반례34 PASS, `check:offline` 등록23suite 및 Next15.5.25 production build/타입 PASS, 원본 `test-results/quality/2026-09-21T16-47-08-810Z-35104/report.json`. `check:evidence -- <동일report>` 종료0·현재source대조 통과. `.env.local`·test-results ignore 확인, 모델호출0. checker 자체테스트는 앱의34개필수AC PASS가 아니다. 실제source/hash·원본로그는보고서에 있으며 commit후HEAD가바뀌면 로컬증거는 그대로새HEAD PASS로재사용하지않고CI에서재실행한다.

원격 read-only 확인: 지정repo public·admin/push/Actions 허용, main branch protection404(없음)·rulesets빈배열. 아직 보호 설정을 변경하지 않았다. 공식 Actions release/ref를API로조회해 checkoutv7.0.1/setup-nodev7.0.0/upload-artifactv7.0.1의commit SHA로pin했다. workflow는contents:read·credential미보존·PR/main·always aggregate/artifact이며실제원격실행은후속이다. 기존 Production·키·사용자.idea는그대로다. 전체모델평가비용상한을비동기질문했고답변전대규모실호출은하지않는다.

Hooke의 [GATE01 독립 검토](reviews/gate-01.md)는 현재hash에서 P1/P2없음·좁은PASS다. Node24 자체검사34를독립실행하고 별도반례37개로실패/누락/zero/skip/stale/로그변조·phase오인/실행종료를확인했다. main의23suite+build원본도현재fingerprint/argv/loghash로검증했고 전체runner/build를중복실행하지않았다. 이것은원격Actions·제품G1~G6/모델/브라우저PASS가아니다. 비밀검사는staged10/client23개 실제키없음·개인/생성파일제외였다. reviewer보고서포함최종staging을한뒤commit/push해실제CI증거를만든다.

### GATE-01 원격 실행·보호 설정 확인

`1f2081c338cbb31ef49f98699d995a638e42f053` commit/push 완료. [Quality run 35628215424](https://github.com/dokrsky/wanna-gs/actions/runs/35628215424)의 실제 Ubuntu24.04/Node24.12.0 실행에서 npm ci, 23개 offline suite와 production build, 원본 로그 aggregate, artifact 업로드가 모두 성공했다. 검사 job `gate`/106427719548이며 API 키를 제공하지 않았다. 새 모델 호출0회다.

PR head는 위1f2081c, base는 `cf6f95a8d40f2f624cbf4035dff1b7523be4782e`, 실제 검사한 merge checkout은 `c281db767b9843ad8067250a2853d998d1f08bd0`이다. GitHub Git API에서 부모 두 SHA와 tree `8eb2c996e63ab098ca06069c4ef470de66108451`를 확인했고 로컬1f2081c tree와 같았다. head 자체와 PR merge SHA를 혼동하지 않는다.

Artifact `offline-evidence-35628215424-1`/10653460145(14일 보관), archive SHA256 `8f25056b7fb9b36c221a34f7883392d52a2bbdcf7195980cb03798e7f026693a`. 내려받은 report SHA256 `b1740a0bc57b6f92bd9bdf7d3dddc0169a1a71f9fb4ab7b35259e34d938b0c52`, source100파일 digest `084089c67176ca1d6f98e26553d5214cfc511960b186f7edb547dfe338dda4d1`. 조정자는 현재 source와 파일별 hash가 같음을 대조한 뒤 원본24개 loghash/argv/결과를 기존 validator로 재확인했다. 총23완료suite+build1/실패0/실행중source변경0이다. 원격원본은 임시 다운로드 경로와 Actions artifact에 있으며 저장소에 대량로그를 복제하지 않았다. 후속 커밋에는 새 CI 실행이 필요하다.

main의 protection없음/rulesets빈배열을 다시 확인한 뒤 `gate`를 GitHub Actions app15368의 required check로 설정했다. strict최신base·관리자에게도적용·PR필수, 별도GitHub사람승인수0, force push/삭제 금지다. API read-back으로 확인했으며 기존 보호 완화·가짜approval·merge·Production변경은 없다. 이 required check는 **offline 집합만 강제**한다. 전체 G1~G6 증거/독립QA/live/CORE·ADR 추적의 기계적 릴리스 판정은 아직 후속이다.

Vercel `dpl_8gdWFjf6N448BC3TuVoVB8rWx86B` / https://wanna-127cqwuzf-d-01.vercel.app/demo Ready, source1f2081c 일치 확인. 앱 소스는 POLICY01과 같고 이번에는 브라우저/모델을 다시 실행하지 않았다. 현재 작업은 progress이며 전체 goal 완료 또는 외부 차단으로 표시하지 않는다. 비용 질문은 답변 대기이고, 독립 데이터/평가셋·결정적 검증 준비는 계속할 수 있다.

## EVAL-01 자료·도구 준비와 원자료 보강 — 2026-09-22 KST

직전 기록 commit `ffdca60bf729eece37d3d0e8d07d0cb31a46d845`의 Actions35628693688/gate 성공과 Vercel `dpl_Hsv9ijm8jhhRCkG5AfxaaMWnELbs` / https://wanna-buow00z89-d-01.vercel.app/demo Ready·source일치를 재확인했다. 기존 앱/Production/모델 설정을 바꾸지 않고 D-46의 작은 게시 단위를 이어간다.

[EVAL01 revision2 계약](context/EVAL-01.md) hash `c9ad2d925058cf7b01f7c1d0359095316b36eeb9d656030ea33245e7cf766cf0`, evalVersion `EVAL-01-20260922-v2`. main 도구/공통 파일, Hilbert 고객 자료, Peirce 경영주 자료, Darwin 읽기 전용 도구 검토로 소유권을 나눴다. 자연어 실험·검증 스킬에 따라 공개 dev/validation과 보호 holdout을 구분하고, ponytail 원칙으로 기존 순수 API 파서와 Node 표준 라이브러리를 재사용했다. 새 의존성·앱/프롬프트/seed 변경0, 모델 호출0이다.

자료는 **합성 초안 고객300/경영주120**이다. 공개 고객240(dev180/validation60), 경영주96(72/24); Git 무시 보호 자료는 담당 curator가 각각60/24를 작성·검사했다고 인계했다. main은 보호 원문을 열지 않고 공개 집계/접근 이력만 읽었다. 공개 hash는 고객 `2ca5ae5e268f6d9e013339375c6f61f71992fcc1bdb762f1de5b85b9b927ed41`, 경영주 `099fb87f983536d87097d0e4d8a85be32b6c910243d38bc71a0eecab63bf8286`; 공개 holdout-summary hash는 각각 `24e608e60656f81e2c5e0f8e1cfdcbf8ec16acfe637554ed44f3c318abe03b2f`, `d803fdbc5ba78f4a31daec74b1bf4b548ee0bf49c1b6ea7099f7bbf4a9b2da94`다. 보호 hash·접근 이력은 그 summary에 있으며 성능 결과가 아니다. 경영주 curator는 초기 패치 진단에 노출된 family를 dev로 옮기고 다른 보호 family로 교체한 이력을 남겼다.

family 개수는 고객69/33/30, 경영주48/24/24로 **60/20/20 목표를 아직 만족하지 않는다**. 별도 장면 기록·라벨 적합성·의미상 family 누수의 독립 검토도 남아 있다. 새 SC 식별자는 현재 inline 참조이며 완전한 연구→장면→case 추적이라고 주장하지 않는다. 공개 검사의 coverageReady는 선언된 최소 case/범주 분모 검사만 뜻한다. SEED-READY·baseline-ready·실제 품질 PASS가 아니다. 고객의 대체 후보 사례를 원상품 정확 식별 성공과 혼합하지 않아야 한다.

검사기는 실제 카탈로그/점포와 서비스별 API 요청·정답 정규화, RC/CORE ID membership, case/group/split 경계·정규화 중복, 고정 분모·ceil95/90/85를 검사한다. 실제 호출/응답 scorer·semantic 판정·UI 지연 측정은 후속이다. 공개 CLI는 공개 두 경로만 받으며 보호 자료 임의 경로를 받지 않는다. 연구 ID membership은 출처 사실/의미 파생 검증을 대신하지 않는다.

Darwin의 [독립 보고](reviews/eval-01-tooling.md)는 최초 P1 1/P2 5를 발견했다: slice/정답 모순, 불가능한 세 번째 질문, 가짜 연구 참조, 덮어쓰기 context로 중복 우회, SKU 집합 순서 우회, 소수점 제거로 정상 예산 충돌. recovery 규칙에 따라 원래 정상 입력을 유지하며 수정했다. 경영주 명령의 실제로 모호한 두 확인 scope는 부분 필드 조합이 아니라 전체 tuple 대안을 명시하도록 v2에 추가했다. 최초 실패 이력은 보존했다. 최종 도구 hash `9c62ee23198c633cda05c6366b22fa209e092c08c2698987c19daa64cc1fb98d`, 자체 checker `98cda43dfa29d521ad6e8281bb463508a0deebb69c82dcd144721005461e3cba`: 자체66·독립 원본반전6/6·별도 인접47 PASS, 이 도구 범위 신규/미해결 P1/P2 없음. corpus 의미·모델 성능 판정으로 확대하지 않는다.

Node24 실제 `check:offline`: 기존23+새3개, **26 suite·production build PASS**. `test-results/quality/2026-09-21T17-18-42-970Z-43104/report.json` hash `5c649ecf49cf67f572cba43f7f4355318fd068ee5a82e3f36aaace1ceeba0640`, source digest `8505a8c0e4ae51a5f0552efe171eac9fec57721552d6c1e39d84e0714541e5d2`, 실행중 sourceChanged=false. 원본 로그/현재 source를 `check:evidence`로 재대조해 종료0. commit 후에는 새 remote CI로 검증하며 이 실행을 다른 HEAD로 승격하지 않는다.

### 점포 원자료의 좁은 사실 대조

Galileo의 [원출처 보강](research/goal-20260922/store-origin-followup.md)은 ST06과 동일한 공식 KTO 기록의 좌표를 확인했고 현재6자리 좌표와 일치했다. 옛 P07 404·기존 수집 이력·개별 재이용조건 미확인까지 해소한 것은 아니다.

Franklin의 [공공 원행 대조](research/goal-20260922/store-primary-rows.md)는 공식 20260630 배포 파일을120초/360MB 상한으로1회 읽었다. HTTP200이었으나120초에252,608,512B에서 중단됐으며 **전체 ZIP이 아니다**. 이미 받은 서울 member의 해제 가능한 prefix에서 ST01/02/03/04/05/08의 완전한39필드 행6개를 관측했다. main도 보존된 부분 파일을 네트워크 없이 별도로 읽어6개 row hash/ID/CRLF·현재6자리 좌표/선택 CSV hash `a99c88261cbb7c1dfcd4e3f37af5ae6bb4f6ff6b60fcab4e3a47bba955216830`를 재현했다. 전체 ZIP/서울 CSV CRC·전역 ID 유일성·현재 영업/출입구 정밀도는 미검증이다. 부분 원본은 `/private/tmp/wanna-gs-store-primary.5YyUzM/semas-20260630.zip`에 남아 있고 저장소에 올리지 않는다. 앱 data/source metadata는 이번에 변경하지 않았으며 최종 data QA 승인이 아니다.

이번 단위는 준비/복구/실제 로컬검사로 progress다. 비용 상한 질문은 답변 대기이며 대규모 모델 호출 없이 할 수 있는 독립 자료 검토·runner 준비를 계속한다. 사용자 `.idea/`·비밀값·보호 원문·Production은 보존한다. 다음은 이 단위의 commit/push·실제 CI/Preview 확인 후 family/장면과 독립 라벨 검토다.

### EVAL-01 게시·원격 실행

staged17파일에서 실제 설정 비밀값2개와 알려진 credential 패턴 후보가 없고 `.env.local`/보호 원문/개인 `.idea/`/실행 부산물이 포함되지 않았음을 확인했다. `5cd1f45636d38a5bc0dac08c4a4c889950c59def` commit/push, PR#1의 EVAL01 준비·한계 구분을 갱신했다. [Actions35631676133](https://github.com/dokrsky/wanna-gs/actions/runs/35631676133)의 `gate`/106439107774가52초에 성공했고, 원격 로그에서 **26suite+build·aggregate·artifact 업로드**를 확인했다. 실제 checkout은 head5cd1f45와 basecf6f95a의 merge `0d4a9f24e27b1742d8c922c3ff06fd4f63c4bde5`; API로 부모·tree `000aef986b6770d8ffeeeee232eb4e3d162881c9`를 확인했고 로컬 head tree와 같았다.

원격 evidence 경로 `test-results/quality/2026-09-21T17-23-32-583Z-2414/report.json`, artifact `offline-evidence-35631676133-1`/10655155112, API archive digest `12a4a14ed2e4c6f752a538fd50f95b5d08513fb428f65b6f027a7ae6e3dc2033`. 이번에는 CI의 실제 aggregate 실행·로그와 artifact 메타데이터를 읽었으며 archive를 별도로 다운로드/재검증하지 않았다. 이전 GATE01 다운로드 검증과 구분한다.

Vercel `dpl_6oxDznSPsJDiJ1E2FEPvkLBNC7bx` / https://wanna-7q8b4sg85-d-01.vercel.app/demo **Ready·source5cd1f45 일치**, GitHub Vercel status success다. 앱 소스/seed는 POLICY01 그대로이며 이번에는 브라우저·모델 재실행0·Production 변경0이다. 해당 게시 성공은 평가 초안의 의미 승인이나 전체 제품 게이트 PASS가 아니다. 다음은 family/장면·독립 라벨 검토이며 비용 질문 답변 없이 대규모 실호출을 시작하지 않는다.

## EVAL-02 독립 자료 감사·응답 대조기 — 2026-09-22 KST

직전 turn은 EVAL01 commit/실제 CI/Ready로 progress였다. 재개 시 HEAD `74d28283691e06619687bf285b597d65de1efb14`, 사용자 `.idea/`만 untracked, Actions35631922195 success와 Vercel `dpl_3cW4smeJAqfyZTRSAJqsrFd8HdrT` / https://wanna-2434ym5na-d-01.vercel.app/demo Ready·같은source를 실제 재확인했다. 전체 preflight·유효한 기존 앱 검사를 처음부터 다시 실행하지 않았다.

[EVAL02 계약](context/EVAL-02.md) revision1 hash `b854718fe0d43ecbcb09c627cca8a6309a839ea014f958f883834b0cad81531a`: main 순수 대조기, Bernoulli 고객 자료 독립 검토(`01a0c502-78a2-7012-88c3-778359ffd842`), Gibbs 경영주 자료 독립 검토(`01a0c502-7914-78c2-aa46-b793680701cb`), Euclid 좁은 코드 검토(`01a0c505-203a-7900-b8aa-a76ced583225`). 각각 보고서만 소유하며 원본 curator/앱 구현자와 다르다. 보호 상세는 평가자 전용 ignored 보고서에 남기고 main은 공개 집계와 공개 사례만 읽는다.

main은 기존 API 순수 파서를 재사용해 실제 request/wire-response 쌍의 ID·세대·점포/버전·문맥·고객의 직전 실제 질문과 후속 답, SKU/kind/status·경영주 완전 tuple 대안을 대조했다. API가 안전 정규화해야 하는 wire payload를 정답으로 세지 않는다. Recall@3/정확kind 진단과 의미상 올바른 선택을 구분하며 semantic은 항상pending·provider raw는unobserved·quality는not_evaluated다. 이 모듈은 HTTP 실행·고정 분모/비용 집행·독립 의미 채점·브라우저/거래 검증을 대체하지 않는다.

EVAL02-FIXTURE-01: 최초 합성 대안 반례의 view가 실제 enum에 없는 `unrequested`라31개 이후 `Invalid evaluation case`/종료1이었다. 실제 계약의 requested/approved/all을 확인하고 fixture의 view만all로 바꿨다. 정상 대안2개·금지된 필드 교차 조합 검사는 그대로 유지하고 **39 synthetic checks PASS**로 재실행했다. 테스트 기대값/앱 정책 변경·skip0이다. 생성된 도구 source hash `bec1dadffe23bb9a785e7e86c9546055a60515193cebab7b6873647625c68eaf`, checker `ec6d9d8eb8dae0df304a1fdba85cab66bfe56de0c2e6cd2b80e32c9511611836`를 Euclid에게 고정 전달했다. 독립 코드/자료 판정은 아직 진행 중이다. 공통 runner selfcheck34는 새 registry에서도 종료0이며 전체27suite/build는 후속이다.

현재 앱·프롬프트·seed·보호 원자료·Production 수정0, provider호출0. 비용 상한 질문 답변은 아직 없으며 모델 대규모 호출을 시작하지 않는다. 완성되지 않은 자료 분할을 숫자만으로 승인하지 않고 독립 결과에서 실제 다음 수정 범위를 정한다.

Euclid의 [독립 응답 대조 검토](reviews/eval-02-response.md)는 같은 matcher/checker/context hash에서 새 수정사항0·좁은PASS다. 별도로 만든 정상3turn/질문·정정·상관ID, 경영주 문맥·복원/정책·전체대안, 정책 안전정규화 및 원문 비노출 **47/47**을 직접 실행했다. 자체39검사를 독립 검사로 합산하지 않았다. reviewer의 최초 harness import순서 오류(exit1/0검사)는 자신의 dynamic import로 수정했으며 앱/매처 수정은 없었다. 보고서의 재현 harness도 같은47검사 재실행으로 확인했고, 공개/보호 authored corpus·모델·브라우저는 읽거나 실행하지 않았다. reviewer 인계/종료 후 자료 감사와 분리해 대조기 단위를 게시한다.

main Node24 `check:offline`의 **27suite+Next production build PASS**, 원본 `test-results/quality/2026-09-21T17-32-54-177Z-46946/report.json`, SHA256 `c4f9e8ba05f979476faaab92f1feb7af100264707ab906c7bcbe86807c135748`. 같은 source/원본 로그를 `check:evidence`로 다시 확인해 종료0. 이 결과는 로컬 offline 도구/기존 앱 회귀이며 자료 의미 검토나 실제 모델 품질을 통과시킨 것이 아니다. 두 역할 자료 검토는 별도로 진행 중이며 이 작은 게시를 기다리게 하지 않는다.

경영주 자료의 첫 독립 인계는 공개96건 직접 검토·보호24건 좁은 구조 검사였다. 공개자료 P1 개발 노출 family2건(M-V-09/15), P2 의미상 동등한 전체tuple 대안 누락6건(M-D-011/012/015/016/017/018)을 확인했다. protected 의미 비교 후보13건은 아직 확정 누수가 아니므로 추가5분 범위로 같은 reviewer가 비공개 상세를 확인한다. main은 보호 상세를 읽지 않는다. 자료는 아직 미수정·baseline-ready가 아니며, 이 도구 게시 후 원래 curator의 의미 보존 수정·새 revision/독립 재검증으로 이어진다.
