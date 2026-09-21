# DATA-01 — 로컬 데모 데이터 인계

2026-09-21, `DATA-01-20260921-v1`. D-46의 화면-first에 따른 병렬 초안이며 UI/Preview 선행조건이나 최종 데이터 검증 통과가 아니다. 연구 스킬에 따라 관찰한 사실과 합성 필드를 분리했고, ponytail 원칙에 따라 의존성 없는 생성기와 작은 일관성 검사만 만들었다.

## 소유·변경 파일

ROOT의 `data/{catalog,stores,provenance,actors,availability,scenarios}.json`, `data/generate.mjs`, 이 연구 폴더만 작성했다. 기존 research worktree의 `README.md`, `samples.md`, `sources.md`, `scenarios-and-review.md`를 apply_patch로 복사했으며 원본은 보존했다. root README의 상단에 DATA-01 안내만 덧붙였다. 나머지 세 문서는 과거 확보분 그대로다. app/lib/scripts/package/lock/shared docs 및 Git commit/push는 작업하지 않았다. 이 인계 시점에 소유권을 coordinator에게 반환한다.

## 건수와 의미

| 데이터 | 실제 생성 건수 | 확인 범위 |
|---|---:|---|
| catalog | 242 | 서로 다른 ID·정규화 명칭/규격. 실제 GS SKU 242개 검증이라는 뜻은 아님 |
| 공식 상품명 참고 | 12 | 농심/오뚜기 원문 이름 확인만. 규격 null, GS 취급·출시·인기 미확인 |
| 미검증 참고 상품 | 27 | 기존 브랜드 예시 3개 + 8월 행사 목록 표기 24개. `reference_unverified` |
| 합성 상품 | 203 | 독립적인 새 상품 개념 200개 + 기존 일반 예시 3개. `synthetic_product`, 실제 브랜드 변형으로 수를 채우지 않음 |
| 실제 점포 | 8 | 공식 이름·주소 + 공개 좌표. 가상 demo-central/neighborhood는 집계 밖 |
| actors | 28 | 합성 고객 20명 + 점포별 합성 경영주 8명. 실제 개인정보·제휴 없음 |
| availability | 484 | 242×8 중 정확히 25%. 상품마다 2점포. 모든 가격·원가·재고·공급·MOQ·배수·요청 가능 여부 모의 |
| 시점 있는 후보 | 24 | S08에 표시된 2026-08 행사 대상이라는 과거 근거만. 현재 인기/최근 출시 24개는 미확인 |
| scenarios | 12 | 공개 개발 목적/기대 서술만. 실행 결과·holdout·앱/모델용 정답 데이터 아님 |

상품 범주는 식사, 빵, 면, 과자, 디저트, 음료, 유제품/커피, 간편식/생활 소품으로 분산했다. 합성 상품은 `데모` 접두사와 설명으로 구분한다. 기존 ID milk/noodle/snack/strawberry/bread/coffee는 유지했다. 가격은 참고 상품도 예외 없이 모의다. aliases/category/description/emoji/color는 검색·화면용 작성 정보이고 제조사 원문 사실로 보증하지 않는다. `verifiedFields`와 `fieldOrigins`가 이름만 확인한 자료와 규격 관찰 자료를 구분한다.

## 8번째 점포 교체와 원문 증거

과거 samples.md의 ST08 ‘뉴역삼아르누보/역삼아르누보’ 차이는 동일 점포로 추정해 봉합하지 않고 제외했다. 데이터의 `DEMO-ST-08`은 **GS25역삼대홍점**, 서울 강남구 논현로63길 19이다.

- S02 [GS25 공식 매장찾기](https://www.gsretail.com/brand/gs25)의 당일 역삼 검색에서 이름과 주소를 확인한 기존 열람 근거를 재사용했다.
- P09 [공개 점포 상세 원문](https://sav.purpleo.kr/article/33495)을 2026-09-21 직접 열람했다. 이름·도로명 주소·지번 역삼동 798-29가 일치했다. 페이지 지도 링크의 좌표는 **37.4924689465589, 127.039294696496**이며 JSON에는 6자리로 반올림한 **37.492469, 127.039295**를 저장했다.
- 따라서 8곳 모두 이름·주소·공개 좌표의 근거가 있으나, 현장 영업·출입구 실측·장애인 접근성·실제 상품 취급을 확인한 것은 아니다. S9언주역점은 지하 POI여서 confidence low, 나머지는 medium이다. 2차 자료의 원 공공데이터 배포판/이용조건 독립 대조도 남았다.

## 시점과 출처의 한계

[S08 원문](https://convpick.kr/events/gs25/2-plus-1)을 다시 읽어 24개 명칭/표시 규격만 옮겼다. 대상 월 `2026-08`과 문서 발행일은 다르므로 `publishedAt: null`, `trend.evidencePeriod: "2026-08"`로 저장했다. 최근 출시일과 현재 인기 확인은 모두 주장하지 않는다. 예: `담터)호두아몬드율무차15입`, `CJ)햇반단호박죽267G`, `페리오휴대용치약칫솔세트`. 확인되지 않은 규격은 null로 두었다. 표시 가격은 가져오지 않았다.

S03/S04의 소비자 탐색 기사 및 S05의 과거 일본 발주 사례는 니즈/시나리오의 맥락이지 개별 상품 인기 증거가 아니다. provenance의 URL, checkedAt, publishedAt, evidenceScope, limitations는 이 범위를 기록한다. 확인 시각을 만들어내지 않고 날짜 단위로 남겼다.

## 통합 시 유의점과 후속 범위

- 이 파일들은 최종 도메인/DB 스키마가 아닌 화면·로컬 seed 연결용 데이터 초안이다. 앱/SQLite 삽입·마이그레이션·기존 요청 연결은 coordinator의 별도 작업이다.
- availability 행 없음은 `unknown/not_configured`다. 실제 미취급·재고 0·공급 종료로 해석하지 않는다. 모의 재고 0과 공급 가능을 구분한다.
- 가상 점포 두 곳은 provenance에만 참고로 보존했다. 실제 점포로 조용히 치환하거나 기존 저장 요청의 점포를 재매핑하지 않는다.
- scenario는 후보 확인/정정/미식별/대체 동의/재고와 공급/묶음 예산/MOQ 초과수요/FIFO·중복/모의 결제 실패/48시간/경영주 상세/저장·reset 목적을 다룬다. 앱·모델에 import하지 않는다. 정책 공백의 답은 정하지 않았다.
- 후속 데이터 확장은 합성 항목을 제조사/공식 목록에서 확인한 독립 SKU로 순차 교체하고 sourceIds와 확인 필드만 승격한다. 현재 인기/출시는 날짜 있는 제품별 근거가 확보된 때만 승격한다. 이 초안은 실제 GS SKU 200개와 최신 인기·출시 20~30개 요건의 완료를 뜻하지 않는다.

## 실제 실행한 작은 검사

Node **24.12.0**에서 아래 두 명령을 실행했다. `--check`는 쓰지 않으며 중복 ID·정규화 명칭/규격·필수 필드·가격의 모의 표시·외래 ID 참조·좌표 범위·20고객/점포별 경영주·희소도·출처 참조·내용 해시 및 생성기와 JSON 6개의 일치를 검사한다.

```sh
/Users/gsr/.nvm/versions/node/v24.12.0/bin/node data/generate.mjs
/Users/gsr/.nvm/versions/node/v24.12.0/bin/node data/generate.mjs --check
```

결과: `check: PASS`, `generatorMatchesFiles: true`, products 242, stores 8, customers 20, merchants 8, availability 484, density 0.25, scenarios 12, historicalPromotionCandidates 24, `releaseVerified: false`.

이는 전사/생성 일관성 자체 검사다. 상품 사실 전수확인, 좌표 현장검증, 독립 검토, 앱 통합, SQL 삽입, E2E/CI/제품 게이트를 실행하지 않았다. Next build/dev와 모델 live 호출도 하지 않았다.

## 독립 검토자 인계 체크리스트 — 아직 미실행

- 데이터/출처 관점: 12개 이름 확인과 24개 2차 표기를 혼동하지 않는가? 합성 203개 및 모의 가격이 화면까지 명확한가? 점포 출처·이용조건·좌표 정확도 한계가 보존되는가?
- 시나리오/제품 관점: 누락 availability를 실제 미취급으로 단정하지 않는가? 기존 점포/요청 연결이 유지되는가? 대체·인기·추천이 구매 동의/확약으로 바뀌지 않는가? 시나리오가 앱 답안으로 유입되지 않는가?

coordinator가 두 독립 검토자 배정과 정책 채택을 담당한다. 공유 PROGRESS는 소유 범위 밖이므로 이 문서를 그 기록용 인계로 제공한다.
