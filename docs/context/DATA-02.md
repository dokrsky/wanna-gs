# DATA-02 앱 반영 계약 · revision 2

2026-09-22 KST. base `65765f77cd19811f85cacfecba2272562e7dd9ac`, branch `codex/ui-preview-20260921`. D-46: 작은 데이터/화면 개선을 먼저 Preview에 게시하고 전체 goal 검증은 후속. 연구 기록은 사실 검토·앱 반영과 별개다.

## 목적과 기준

고객이 최근 발표 상품을 자연어로 찾고 모의 조건을 확인할 수 있게 한다. CORE-03/04/14/17/21/22/25, AC-23/31 및 docs/19·24·29, ADR-001/003/005/006을 유지한다. 기존 이름/규격/가격/조건/동의/픽업 48시간을 자료 갱신으로 바꾸지 않는다. 상품 존재·출시 발표·인기·현재 점포 재고를 구분한다.

- card `62fae686c1967902ac443a0a315f4c7f59f76df9e6de3a3568e4355d6e334e03`, CORE `65c7541d3549bf49b715da687aa5af060fce9a48e774a4130d9ac350349d8114`, 사용자02 `aa75d143ddefdd500adadd2fb6436a26683b1609af274b64680b36d5a0c0de15`.
- 연구 원본: `docs/research/goal-20260922/recent-products.json` SHA256 `a1b134c5d2d01563fd62857d294e488b76e03098a64b4f02175078c0d017f051`, 같은 폴더 md `ea5d40bda564f7b07bbadb50c89d30cfa6ff4c505ebb1ca62168cd79c14db03a`, 점포 보고 `3206975577946f4d443465c151a8207bd6bd8fcbba8cbdc68e90bb60900b3578`.
- 기존 schema3/sourceHash `b665391bac2a443ae0a42f850828e3c0ceaafaad4c9f7c8058c1b67453f24051` 및 schema1/2 알려진 hash만 이행 대상. 임의 hash/손상 사본을 덮어쓰지 않는다.

## 단일 데이터 작성자

data/generate.mjs·생성 JSON6개, lib/domain/storage.ts, scripts/prepare-domain-sqlite.mjs 및 필요한 전용 데이터/SQL checker를 작성한다. 같은 작성자가 seed/source hash·이행 계약을 소유한다. 앱 UI·assistant·공유 문서·lockfile·git/build/브라우저/실제 모델은 main 소유이며 변경하지 않는다.

revision2: 인접 소비자 점검에서 `/`의 이전 Preview도 동일 catalog를 쓰는 것을 확인했다. 단일 작성자의 범위에 `app/preview-store.ts`, `scripts/prepare-preview-sqlite.mjs`, `lib/domain/check.mjs`를 추가한다. 이전 Preview schema2/sourceHash `2faebdf382c933e25c382e4dfa833e55de6c4ae304c991bb51a4c4e3efc42279`만 알려진 자료 이행 대상으로 허용하고 기존 요청·승인/가격·순서 전부 보존, 신규 seed 요청은 재삽입하지 않는다. 기존 v1 이행도 보존한다. 자체 checker의 카탈로그 수 검사는 새 명시적 기대값/ID 보존과 연결하며 일반 무조건 통과로 완화하지 않는다. main은 app/page.tsx의 카운트를 실제 catalog 길이로 바꾸고 app/demo-preview.ts의 stale 주석만 고친다. 상품 자료 변경으로 이전 화면을 강제 reset시키지 않는 인접 회귀 방지이며 새 기능/정책이 아니다.

연구 후보 중 기존 이름 3개(RP-018~020)는 새 SKU로 복제하거나 size:null을 몰래 특정 규격으로 바꾸지 않는다. 미래 예정 RP-021은 연구에 보존하고 현재 주문 후보에 추가하지 않는다. 나머지 20개를 우선 이름/형태 근거가 있는 참고 상품으로 검토하여 기존 242개 뒤에 추가한다. 독립 사실 검토에서 불충분한 항목은 보류하고 개수를 억지로 채우지 않는다. 새 ID는 고정 DEMO namespace이며 현재 GS SKU가 아니다. 미확인 용량 null·현재 재고/인기 미확인·예정과 실출시 차이를 설명한다. 카테고리·별칭·가격/취급/공급은 기존 구분을 따르는 합성/모의 값이며 보호 holdout을 사용하지 않는다.

기존 242상품의 ID/이름/규격/가격과 484조건의 값·version, 기존 점포 ID/좌표·합성계정은 보존한다. 새 상품의 모의 조건만 기존 희소 생성 규칙으로 추가한다. 알려진 기존 snapshot에는 읽기 전용 근거 갱신/새 상품·조건 추가만 허용하고 모든 기존 거래·정책·receipt/로그·시각·revision/generation을 보존한다. 이행은 실제 SQL 단일 트랜잭션·export/persist 완료 후 공개하고 실패는 원본 유지·재시도 가능 오류다. 이행 때문에 seed 요청을 재삽입·정산·자동발주하지 않는다. 전후 고유 ID/기존 행 비교와 실패/재시도/재열기 검사를 남긴다. 새 source hash가 같으면 재이행하지 않는다.

점포 보고서의 공식 이름/주소 대조와 출처/오차/제한을 보강하되 좌표를 새 값으로 교체하지 않는다. 원출처를 아직 확인하지 못한 항목과 ST06 과거 출처404, GS 공개 응답의 CRS/재사용조건 미기재를 숨기지 않는다. 연구 보고 전체나 보호 데이터는 앱 asset에 복제하지 않는다.

## 독립 검토와 main

- data reviewer는 수정 없이 최근 상품 20개에 필요한 원문·규격/날짜·중복과 근거 라벨을 검토한다. 공개 자료 사실만, 연구 시나리오는 dev 전용. 첫 12분 이내 근거와 미확인 범위를 인계하며 새 상품 무한 수집 금지.
- main은 UI10 게시 증거/점포 출처 확인·공유 docs·최종 diff/build/Preview/브라우저를 맡는다. 구현 handback 뒤 별도 검토자가 새 SQL 보존 경계만 독립 검사한다. 작성자 자체 검사는 독립 검사로 세지 않는다.
- 각 agent는 실제 manifest·card/CORE/유효 결정을 읽고 hash/소유권 ACK 후 진행한다. 경계 문제를 발견하면 구체 반례를 보고하고 임의 정책/목표 변경은 하지 않는다.

## 종료

첫 구현 handback은 작동하는 후보/자체 검사·정확한 변경 파일·한계를 제공한다. 작은 Ready와 실제 검색/이전 사본 복원 확인을 한 뒤 다음 작업으로 넘어간다. 전체 최근자료·자연어 품질/eval·UX/G5/G6·Production 완료는 별도다.
