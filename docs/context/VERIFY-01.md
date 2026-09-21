# VERIFY-01 검증 전환 준비 · revision 1

2026-09-22 KST, base `25e1e9d71583655679a3fb3dd91ad2cf79accecd`, branch `codex/ui-preview-20260921`. UI11은 별도 소유 파일에서 병행하며 본 검토를 기다려 게시하지 않는다. D-46 화면 우선 순서와 최종 GOAL/CORE-01~26 범위를 유지한다.

## 현재 실제 상태

고객/경영주·실제 SQLite schema3·서버 OpenAI gpt-5-mini, 262상품/8점포/524조건이 Preview Ready다. DATA02 source hash `88f9d52f3a8dea7fa72e2f058b4c2ac3e90c0a6c5de4a60f2963437aa49f1672`. 자체 unit/SQL·좁은 독립 코드 검사와 일부 실제 live/browser 정상 사례는 PROGRESS에 있다. 아직 전체 QA·기계적 CI gate·버전별 자연어 baseline/holdout·G5/G6·최종 Production은 없다. 기존 로컬/Preview 호출은 공개dev smoke이며 고정 evaluation baseline이 아니다.

## 목적·경계

기능 구현 후 실제 검증을 시작할 수 있도록 기존 proposed ADR-002를 두 독립 관점으로 검토한다. 사후 기준 완화·공개 예시로 holdout 오염·행동 누락·무제한 유료 호출·자기 검증·문서뿐인 CI를 막는다. 이미 작동하는 정상 흐름/동의/보수적 수량·예산/48시간을 유지하며 새 외부DB·실GS/결제·D40 미채택 기능은 추가하지 않는다.

원문은 card/CORE/index/GOAL/14·17·20~25 및 ADR-002다. 제안에는 초기 scaffold 시점 설명/420 baseline과 holdout 순서/실제 retry·timeout/가용 비용 불명확성 등 현재 구현과 대조할 부분이 있다. 이를 미리 통과로 보지 않는다. reviewer는 상대 보고서를 읽기 전에 독립 판단을 작성한다. 보호 holdout 원문/정답은 아직 만들지 않으며 이번 검토에 공유하지 않는다.

## 소유권·출력

- product/eval reviewer: 읽기 전용 대상, `docs/reviews/verify-01-product.md`만 작성. 사용자 범위·표본/분모/threshold·family 분리·정상/모호/실패와 UX 부담의 구체 반례, 유지/수정할 최소안.
- method/state reviewer: 단일 method-auditor 겸 별도 ADR 검토, `docs/reviews/verify-01-method.md`만 작성. 실제 코드/명령의 retry/timeouts/CI/independence·context/작업중단 기준과 제안의 일치, 호출 상한 산정·실행 가능성. 추상 매니저/하위 에이전트 생성 금지. 한 가지 최소 운영 개선의 사전 조건·한정 관찰 구간·복구 제안.
- main: ADR/index/공유 문서·runner/CI/실행 계약의 단일 작성자. 두 보고 뒤 반례를 해결하고 보완 ACK 전까지 proposed. 이번 검토 자체를 제품 QA/모델 실행 성공으로 표시하지 않는다.

첫 보고는8분 이내, 추가 조사/실제 모델·build·브라우저·Git 작업 없이 필요한 로컬 read-only 검사만 한다. 실제 manifest/card/CORE/index/ADR hash·역할/금지범위 ACK를 남긴다. 최대 초안+보완2회로 불필요한 반복을 막되 새 중대 반례는 숨기지 않는다. 스킬/문서보다 실제 코드·실행 결과를 근거로 하며 권한/잔액은 unknown을 성공으로 바꾸지 않는다.
