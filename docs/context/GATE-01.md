# GATE-01 실제 offline CI 연결 · revision1

2026-09-22, base `6db1d9bebf8db4647117cf4cbea2d0caefefbdb2`, branch codex/ui-preview-20260921. D-46: 게시된 기능을 유지하며 기존 검사를 실제 CI로 연결한다. 문서만의 강제/전체제품PASS를 주장하지 않는다.

## 목적·유효 기준

CORE-13/15/17/18/20/23, ADR002 revision2 채택 hash `48841b2f3e06881486636b1492c9198044a0e2ff91704a2ca2bf7c09837967a2`, D44/45/46. card·CORE·index·docs14/16/20/09/13과 verify/ponytail을 읽고 역할/실제hash ACK. 현재 앱262상품/8점포/524조건/schema3. Preview는 UI11/POLICY01 준비 완료이며 Production은 기존 stub/모델 비활성이다. 이전 전체평가/독립UX/CI는 없다.

## 파일 소유·인계

- registry worker: `quality/checks.json` 하나만. 현재 실제 Node/Python offline suite 모두를 읽어 명령/성공 marker/최소 suite 수/의미·한계를 등록한다. 체크 로직·package·앱·공유 docs는 수정하지 않는다.
- main: `scripts/quality.mjs`, `scripts/quality.check.mjs`, `.github/workflows/quality.yml`, `.nvmrc`, package.json, 공유 docs. 기존 의존성/lockfile 유지.
- 독립 reviewer: 준비된 runner/registry/CI를 실제 반례로 검토. 자기구현을 독립검증으로 세지 않는다. 전체live/브라우저QA와 분리.

## registry v1 계약

JSON `{version:1, checks:[{id, command, args, marker, minMatches, mode, scope, core, limitation}]}`. id는 고유 kebab-case. command는 `node|python3`, args는 정확한 argv 배열(shell 금지). marker는 stdout+stderr에서 마지막 명시 완료 신호를 확인하는 정규식 문자열; minMatches≥1은 **완료 suite 수**이며 assert/상품/케이스 수가 아니다. mode는 `offline`, scope는 `unit|integration|static`; core는 관련 CORE ID 배열, limitation은 실행하지 않은 browser/live 등을 명시한다. Python unittest는 stderr의 Ran N tests와 OK를 확인할 수 있는 marker로0개·skip이 숨지 않게 한다. Node prepare seed/check 순서를 고려해 dependency가 필요하면 순서대로 등록한다. DATA02는 과거 git object가 필요하므로 CI fetch-depth0을 main이 적용한다. build는 runner의 별도 실제 단계이며 suite count를 만들지 않는다.

## 실행기·검증 기대

현재 phase는 `offline`(출시 G1~G6와 다름). 실제 개별 프로세스를 실행하고 argv/시각/exit/signal·명시 완료 suite 수·원본 loghash·현재HEAD/소스content hash를 결과에 남긴다. 모든등록suite와 build를 수행한 후 항상 aggregate결과를 낸다. 실패/0개/누락marker/timeout/필수skip/stale를 nonzero로 거절한다. 입력JSON의passed:true만 읽지 않는다. 로그와현코드 fingerprint를 대조하는 verifier를 제공한다. standalone계산반례로누락/0개/실패child/변조log/stale를 거절한다. offline결과를live·G4~G6로 승격하는 phase요청은 명시거절한다.

원격 PR CI는 최소read권한·API키없이·정확한checkout(commit 및PR head/base기록)에서 npmci→실제runner→항상 aggregate gate와artifact를 남긴다. 새로운유료서비스/구매/외부repo변경/Production배포/보호완화는 없다. required-check원격정책은 기존상태/권한을 확인하고 지원되는 범위에서 설정하며 미지원은외부제약으로 기록한다.

첫 registry handback8분, 이후 좁은review/build/실제Actions 확인. 모든후속live/브라우저증거 schema까지 한 번에 만들기보다 현재 실행가능한offline집합을 게시한다. 최종게이트확장/독립품질/비용상한/전체완료는 남아있다고보고한다. 사용자 `.idea/`·비밀값·기존거래보존.
