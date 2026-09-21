# UI-10 / DATA-02 작업 계약 · revision 1

2026-09-22 KST. base `9e2b6bfd116929e56b9d3735bccdec6ff1ba99c2`, branch `codex/ui-preview-20260921`. 직전 UI09B는 commit/push·Ready·실제2호출/로그 복원으로 진행했다. D-46에 따라 화면과 데이터 개선을 먼저 작은 Preview로 게시하고 최종 품질/CI/eval은 후속이다.

## 목적·불변식

- CORE-04/14/22/24/25, AC-23/30/31. 고객은 동일 선택 점포의 위치를 확인할 수 있고 지도 실패에도 조건/동의/요청을 계속할 수 있어야 한다.
- card hash `62fae686c1967902ac443a0a315f4c7f59f76df9e6de3a3568e4355d6e334e03`, CORE `65c7541d3549bf49b715da687aa5af060fce9a48e774a4130d9ac350349d8114`, 사용자02 `aa75d143ddefdd500adadd2fb6436a26683b1609af274b64680b36d5a0c0de15`, ADR004 `f04c34ef1831f62600c24a737345093271234ffc07b48e1dd3f292c1f161ce7a`를 실제 읽고 ACK한다.
- 기존 거래/SQLite 사본·픽업 마감·서버 모델 키는 유지한다. 실제 GPS/GS 재고/청구/새 유료 지도·외부 DB는 추가하지 않는다. 지도 정책 변경이면 최소 두 독립 검토를 거치고 실패를 가짜 성공으로 바꾸지 않는다.

## 소유권·병행

- main: 지도 원인 재현·필요한 최소 UI/helper/check 수정, docs/PROGRESS·WORKPLAN·index/이 계약·통합/build/git/Preview. 기존 선택 점포 iframe의 정상 렌더와 fallback을 소량 확인한다.
- product researcher: 새 `docs/research/goal-20260922/recent-products.md`와 `recent-products.json`만 작성한다. 최근 관심/신상품 목표20~30개를 위해 공식/신뢰 자료의 사실을 수집하되 확인하지 못한 항목을 만들지 않는다. 첫 bounded batch는 최대24개 독립 SKU. 실제 source 원문 확인, 제품명/규격별 근거, 출간/사건/확인일, product/trend 신뢰도·한계·이용 메모, 합성 공개 개발 scenario family를 남긴다. 가격/재고/판매량을 추정하지 않으며 holdout은 만들지 않는다.
- store researcher: 새 `docs/research/goal-20260922/store-evidence.md`만 작성한다. 기존 data/stores.json의8개 ID·이름·주소·좌표와 출처의 원배포/이용조건·오차를 독립 재확인한다. main 지도 코드/실제 브라우저를 건드리지 않는다. 변경 제안은 기존 ID를 재매핑하지 않고 근거와 함께 인계한다.
- 연구자는 data/generate·catalog/stores/provenance/SQL/shared docs를 수정하지 않는다. main이 수집 결과/독립 검토 뒤 단일 데이터 소유자를 별도로 배정한다. 새 공개 자료를 앱에 자동 import하지 않는다.

## 종료·증거

연구는 첫12분 이내 확보한 원문과 정확한 미확인 범위로 handback한다. 무한 검색·모든 기능 재감사·추가 관리자를 만들지 않는다. 각 source의 직접 열람 여부와 source→필드→시나리오를 남긴다. 계정/보안 차단은 우회하지 않는다. 지도는 기존 UI05 두12초 timeout 사실을 바탕으로 브라우저/공급자/코드를 분리 진단하고 원인 증거에 맞춰 수정한다. 최종 G4/G5/G6와 데이터 전체 완료를 이 한 배치로 선언하지 않는다.
