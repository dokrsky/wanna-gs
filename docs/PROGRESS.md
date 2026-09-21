# 진행 기록

최종 갱신: 2026-09-21. goal 진행 중이며, 최신 D-46에 따라 화면 구현·잦은 Preview 공유를 먼저 수행한다.

## 현재 포인터

```text
현재 task: UI-04 여섯 번째 Preview 완료, UI-05 점포 지도 연결
branch: codex/ui-preview-20260921
PR: https://github.com/dokrsky/wanna-gs/pull/1 (draft, 최종 검증 전)
마지막 유효 게이트: 제품 게이트 미실행
마지막 Production deployment: dpl_GB3Cr8At3Com7eJcTnboJ9W4Sika (기존 최소 데모, 최종 제품 아님)
현재 Preview: https://wanna-e2y9lytyw-d-01.vercel.app/demo (b4a2854, 요청부터 픽업)
다음 한 가지: 점포 지도 UI-05를 작은 Preview로 공유한 뒤 미식별/정책 AI 연결
```

## 현재 상태

| 항목 | 상태 | 증거 |
|---|---|---|
| 요구사항·실행 계약·스킬·템플릿 | 최신 지시 반영·문서 검증 완료 | README·card·02·WORKPLAN·GOAL |
| 위임 운영 결정 | ADR-001 채택, 실행 검증 전 | DECISION_INDEX·ADR-001 |
| GitHub | dokrsky/wanna-gs, 기준 cf6f95a, 작업 branch에서 UI 개발 중 | 원격 쓰기/Actions 권한 확인, 제품 CI 미구현 |
| 로컬 설정/사전점검 검사기 | OpenAI 15개 + inventory 10개 테스트 통과 | scripts/ 및 .agents/skills/wanna-gs-preflight/scripts/ |
| 앱·CI·게이트 실행기·DB seed | 두 역할 UI·SQLite·두 역할 실제 AI와 UI-04 거래 Preview Ready. 거래 로컬 정상 흐름 확인. 제품 CI/게이트 후속 | D-46·WORKPLAN, b4a2854 |
| SQLite | 242개 상품·실제 점포8/legacy2 Preview 배포. 새 거래 DB 별도 namespace·실제 정규화 SQL·기존 이력 보존 | UI-04 로컬 요청→수령, IndexedDB 사본 새로고침 복원 |
| Vercel·OpenAI | Git 자동 Preview 및 UI branch 서버 env 연결. 두 역할 실제 호출 성공 | 고객 18b0b31·경영주 bd13e3f. gpt-5-mini, 고객 로컬 719/127·Preview 719/136 tokens |
| 앱 단위·통합·E2E·실제 모델 평가 | 미실행 | 문서 검사와 구분 |
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

1. D-46에 따라 UI-05 점포 지도를 작은 커밋·Preview로 공유한다.
2. 미식별 니즈·미래 정책 AI·지도와 데이터 사실 보강을 연결하고 각각 Preview를 공유한다.
3. 기능이 갖춰진 뒤 독립 검증·전체 E2E·평가·최종 게이트를 실행한다. 이미 실행 중인 goal을 다시 만들지 않는다.

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
