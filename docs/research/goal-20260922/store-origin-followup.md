# EVAL-01 점포 좌표 원출처 후속 조사

2026-09-22 KST · `STORE-ORIGIN-FOLLOWUP-20260922-v1` · 독립 source researcher, seed 작성자/최종 data QA와 분리

## 인계 결론

**ST06의 기존 좌표와 같은 수치를 한국관광공사의 공식 공개 상세 응답에서 확인했다.** `cid=3306541`, 동일 상호·도로명·동원빌딩, `mapY=37.5069791967`, `mapX=127.0545102294`다. 현재 seed의 위도 `37.506979`, 경도 `127.054510`과 소수 여섯 자리 반올림이 모두 일치한다. P07 Yoonoo의 HTTP 404는 그대로이며, 이번 결과는 별도의 공식 근거가 생긴 것이다.

**Purpleo 6곳의 업소번호·좌표는 재확인했지만 공식 배포 CSV의 해당 6행은 확인하지 못했다.** 공식 배포판·첨부파일 식별자·공개 이용조건·접근 방법은 확인했다. 제공 ZIP이 352,699,739바이트이고 Range 요청을 무시하여 소량 조사에서 전체 수집으로 확대하지 않았다. 공식 CSV에서 행을 찾지 못했다는 결과가 아니라, 서울 CSV 본문을 열지 않은 결과다.

재이용 근거도 분리한다. 상가정보의 공식 포털 표시는 무료·이용허락범위 제한 없음이다. Purpleo가 사용한 정확한 원배포판은 미상이다. TourAPI 개방 데이터의 허락 표시는 확인했으나, 이번에 읽은 VisitKorea 웹사이트 응답 전체에 그 허락이 적용됨을 확인한 것은 아니다. 좌표 대조 성공으로 재배포 조건까지 PASS 처리하지 않는다.

## 계약 ACK와 범위

- `consumed_context_hash`: `15b4184e12744ba85d7da2d0667ddd72af10253fef23d29c16602d2dc035a21c`. `docs/context/EVAL-01.md` 파일 바이트 SHA-256과 요청값 일치, revision1 ACK.
- 목적: CORE-01/04/14/22/24/25, D-26/44/45/46, ADR-004에 따라 같은 실제 점포의 참고 위치와 기존 고객 요청·동의·모의 거래 연결을 유지한다. 좌표 검증을 이유로 점포를 교체하거나 기존 ID/거래를 재매핑하지 않는다.
- 시작: **2026-09-22 01:59:15 KST**, 조사·보고 포함 10분 상한. source 확인시각은 아래에 KST로 기록한다.
- 읽음: card, docs/README, 02번 관련 결정, CORE, DECISION_INDEX, ADR-004, PROGRESS 최신 기록, 20번 context/ACK, 연구 스킬, docs19/24와 연구 양식, **store-evidence.md 전체**, 현재 `data/stores.json`과 `data/provenance.json`의 점포 출처. 앞선 GS 8곳 이름·주소 증거를 재수집하지 않았다. ST07의 OSM 조사도 반복하지 않았다.
- 적용 스킬: [wanna-gs-research](../../../.agents/skills/wanna-gs-research/SKILL.md). 직접 읽은 응답, 필드별 근거, 발표/확인일, 미확인을 나누어 기록했다. 별도 독립 재검토·최종 data QA 판정은 main의 후속 역할이다.
- 유일한 쓰기는 이 문서의 `apply_patch`다. 데이터/앱/SQLite/공유 문서/PROGRESS 수정, 환경변수 조회, 모델 호출, Git, UI, 서브 에이전트, 로그인/가입/유료/인증·보안 우회는 수행하지 않았다. 공개 페이지가 연결한 조회 경로만 읽었으며 raw 응답·ZIP·이미지를 파일로 저장하지 않았다.
- manifest의 base `ffdca60bf729eece37d3d0e8d07d0cb31a46d845`는 계약에서 읽은 값이다. Git 금지에 따라 현재 HEAD/branch를 조회하거나 검증했다고 주장하지 않는다.

### 입력 파일 지문

파일 바이트의 SHA-256이다. provenance 내부 정규화 객체 해시와 다르다.

| 파일 | SHA-256 |
|---|---|
| `data/stores.json` | `e6f39a73cafc5738f00a505a663d66550f234aef6a669cf7ecf3d9ef5ba93fd2` |
| `data/provenance.json` | `6cf20fbfbdc2c3f0e9647707104ec4d070e6d143eef474368150e1b6330afd89` |
| `docs/research/goal-20260922/store-evidence.md` | `3206975577946f4d443465c151a8207bd6bd8fcbba8cbdc68e90bb60900b3578` |
| `card.md` | `62fae686c1967902ac443a0a315f4c7f59f76df9e6de3a3568e4355d6e334e03` |
| `docs/CORE_REQUIREMENTS.md` | `65c7541d3549bf49b715da687aa5af060fce9a48e774a4130d9ac350349d8114` |
| `docs/DECISION_INDEX.md` | `fc0a5e4c748f4c2303ee7c4250d290517a58529d35fab8a824afa9f329e32523` |
| `docs/decisions/ADR-004-store-map.md` | `f04c34ef1831f62600c24a737345093271234ffc07b48e1dd3f292c1f161ce7a` |
| `docs/19-data-research-and-seeding.md` | `a0d9f7b9c415a052e6cf6412755768c0484d0f5b3e02b7d96ee1e13845717827` |
| `docs/24-market-research-and-scenario-design.md` | `028fd5442224be6dc515e3e96692d0ed4b74c193413aba8c7f537172d74f4c4d` |
| `.agents/skills/wanna-gs-research/SKILL.md` | `c82c4dc6f7dc3b8d39e5f640830db0b640349752697e86f7bcc3130642bef5dd` |

현재 provenance는 `version=DATA-02-20260922-v1`, `researchVersion=DATA-02-RECENT-20260922-v1`이다. 이미 SE-GS-* 이름/주소 보강과 P07 404가 반영되어 있으므로 그 작업을 다시 제안하지 않는다.

## ST06: 공식 관광정보에서 현재 좌표 대조

`SO-KTO-PAGE`: [한국관광공사 GS25강남동원점](https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=0fedb001-f9d8-4ed9-8eac-518147be3aab). 02:00:16 KST GET 200. 초기 HTML의 `cid`, `cotId`, `contitle`와 페이지 자체 `getContentList()`의 공개 상세 조회를 읽었다. 이 HTML은 좌표 본문 자체가 아니므로 아래 응답과 구분한다.

`SO-KTO-DETAIL`: [공식 웹 상세 조회 경로](https://korean.visitkorea.or.kr/call). 공개 페이지가 수행하는 **조회용 POST**를 재현했다. 회원 계정·쿠키·API 키·GPS는 사용하지 않았다. 요청은 `application/x-www-form-urlencoded`이며 다음 값이다.

```text
cmd=TOUR_CONTENT_BODY_DETAIL
cotId=0fedb001-f9d8-4ed9-8eac-518147be3aab
locationx=
locationy=
stampId=
```

02:00:39 및 02:04:18 KST HTTP 200, `header.process=success`, 응답 4,472바이트. 두 조회에서 아래 필드가 동일했다. GET 링크만 열어 같은 JSON이 나올 것으로 안내하지 말고 재현 시 POST 방법을 함께 보존한다.

| 응답 경로 | 직접 확인한 값 | 지원 필드/한계 |
|---|---|---|
| `body.detail.cid` | `3306541` | P07 URL contentid와 같은 관광정보 식별자 |
| `body.detail.cotId` | `0fedb001-f9d8-4ed9-8eac-518147be3aab` | 공식 개별 페이지와 응답 연결 |
| `body.detail.title` | `GS25강남동원점` | 동일 상호; 점포 교체 사유 없음 |
| `body.detail.addr1` | `서울특별시 강남구 테헤란로77길 7 동원빌딩` | 현재 주소와 일치; 층·출입구는 증명하지 않음 |
| `body.detail.mapY` | `37.5069791967` | 현재 위도에 소수 6자리 반올림 일치 |
| `body.detail.mapX` | `127.0545102294` | 현재 경도에 소수 6자리 반올림 일치 |

원좌표와 seed의 반올림 차이는 haversine, 지구 반지름 6,371,000m 기준 약 **0.0298m**다. 실측 정확도가 아니다. 이전 GS 좌표와의 9.96m 차이를 대체하는 수치도 아니다. 각각 다른 비교다.

응답에 CRS 명칭·좌표 실측/갱신일·원본 제공 연월·개별 이용허락 필드는 없었다. `contentStatus=77`이 있지만 이번에는 의미를 확인하지 못해 영업/게시 상태로 해석하지 않는다. 영업시간·주차 등 부수 필드를 현재 운영 사실로 seed에 옮길 근거도 만들지 않았다. P07의 과거 `publishedAt=2024-06-12`, API 갱신 `2026-01-24`는 이번 공식 응답에서 재확인되지 않았다.

`SO-P07-404`: [기존 Yoonoo URL](https://yoonoo.kr/travel/detail.php?contentid=3306541&page=4247)은 02:03:54 KST에도 HTTP 404, 1,305바이트였다. 검색 캐시를 현재 원문 확인으로 사용하지 않았다. 공식 사이트의 동일 contentid·주소·정확 좌표 일치는 원출처 후보 연결을 강하게 뒷받침하지만 Yoonoo의 과거 ETL/취득시점이나 당시 TourAPI 원응답까지 복원한 증거는 아니다.

### ST06 재이용 조건

- `SO-TOURAPI-TERMS`: [공공데이터포털 TourAPI 15101578](https://www.data.go.kr/data/15101578/openapi.do?recommendDataYn=Y), 02:01:34 KST 직접 GET 200. 등록 2022-06-24, 수정 2026-02-26. 무료·이용허락범위 제한 없음이며, VisitKorea 자료 중 자유롭게 활용 가능한 정보를 **선별해 OpenAPI로 제공**한다고 설명한다. API 활용신청/키 경로는 이번에 사용하지 않았다.
- `SO-KTO-COPYRIGHT`: [한국관광공사 저작권 보호정책](https://knto.or.kr/helpdeskCopyrightguide), 02:03:53 KST 직접 GET 200. VisitKorea footer의 `openCopyrightPolicy()`가 연결하는 정책이다. 개별 공공누리 유형을 확인하고 출처를 표시하도록 안내하며, 공공누리 미표시 자료의 이용은 사전 협의 대상으로 설명한다. 다른 권리자 자료에는 별도 조건이 있다. 정책 게시/개정일은 이번 본문에서 확인하지 못했다.
- **관광 좌표 사실의 공식 대조 완료와 그 응답의 개방 라이선스 적용 완료를 분리한다.** SO-KTO-DETAIL에는 개별 KOGL 표시가 없어 이번 연구로 `reuseTermsVerified=true`를 만들지 않는다. TourAPI의 허락을 VisitKorea 전체에 확장하지 않는다. 사진·본문·지도 이미지 복제나 담당자 연락은 하지 않았다. 이것은 관찰한 제공조건의 기록이며 포괄적 법률 판단이 아니다.

## Purpleo 6곳: 원배포 추적과 현재 값

다음 6개 상세 페이지는 02:03:27 KST 모두 일반 GET 200. JSON-LD `Place.geo`, `additionalProperty`의 상가업소번호와 화면 원본정보 표를 읽었다. 아래 좌표는 **위도, 경도** 순서다. `Number(value.toFixed(6))`로 현재 seed와 비교하여 두 축 모두 6/6 일치했다.

| 기존 ID / 출처 URL | Purpleo의 상가업소번호 | 직접 읽은 좌표 | 현재 seed 좌표 |
|---|---|---|---|
| ST01 / [P01 38894](https://sav.purpleo.kr/article/38894) | `MA010120220812689199` | `37.5051540204139, 127.042456761212` | `37.505154, 127.042457` |
| ST02 / [P02 39182](https://sav.purpleo.kr/article/39182) | `MA010120220813191142` | `37.5040812614413, 127.043994256178` | `37.504081, 127.043994` |
| ST03 / [P03 40030](https://sav.purpleo.kr/article/40030) | `MA0101202211A0049679` | `37.5056863777657, 127.040274267609` | `37.505686, 127.040274` |
| ST04 / [P04 35842](https://sav.purpleo.kr/article/35842) | `MA010120220804444974` | `37.5019457772543, 127.044264425285` | `37.501946, 127.044264` |
| ST05 / [P05 41983](https://sav.purpleo.kr/article/41983) | `MA0101202409A0003712` | `37.5049011971956, 127.043938188812` | `37.504901, 127.043938` |
| ST08 / [P09 33495](https://sav.purpleo.kr/article/33495) | `MA010120220800340808` | `37.4924689465589, 127.039294696496` | `37.492469, 127.039295` |

ST는 기존 `DEMO-ST-*`의 축약이며 새 ID가 아니다. 표의 업소번호는 여전히 **Purpleo가 표시한 원본 식별자**다. 공식 배포 CSV 행 식별자로 직접 인증한 것으로 바꾸지 않는다. 도로명은 각각 언주로98길 7 / 테헤란로43길 12 / 테헤란로39길 51 / 언주로86길 11 / 언주로98길 25 / 논현로63길 19였다. 정확한 GS 명칭·층/호수 근거는 앞선 store-evidence의 공식 GS 자료를 유지한다.

새 확인 사항: 6곳 모두 JSON-LD `WebPage.datePublished`와 `dateModified`가 **2025-04-27**이다. 이는 사이트가 표시한 페이지 날짜이며 원배포 기준일·실제 수집일은 아니다. 현재 공식 배포판 20260630을 Purpleo가 당시 가져온 판이라고 기록할 수 없다. 원본 분기는 여전히 unknown이다.

### 공식 배포와 소량 접근의 실제 결과

`SO-SEMAS-META`: [소상공인시장진흥공단 상가(상권)정보 15083033](https://www.data.go.kr/data/15083033/fileData.do), 01:59:47~02:00:04 KST GET 200. 공식 제목 `상가(상권)정보_20260630`, 등록/수정 2026-08-05, 분기 갱신, CSV·UTF-8·원문파일 배포다. 상호·주소·경도·위도를 제공하며 **무료·이용허락범위 제한 없음**을 표시한다.

공개 HTML의 다운로드 버튼과 직접 연결된 `script_fileDetail.js`/`script_cmmFunction.js`에서 정상 다운로드 절차를 읽었다. 계정이나 숨겨진 인증값을 사용하지 않았다.

| 확인 대상 | 직접 관측 |
|---|---|
| 배포 상세 식별자 | `publicDataPk=15083033`, `publicDataDetailPk=uddi:b3094bc9-8756-4ecc-9141-9144b98a531e` |
| 첨부 메타데이터 | `atchFileId=FILE_000000003695831`, `fileDetailSn=1`, `orginlFileNm=소상공인시장진흥공단_상가(상권)정보_20260630.zip` |
| 정상 제한 검사 | `/cmm/cmm/check-limit.json`에 해당 파일 ID/Sn만 POST, 02:01:18 KST 200, `needCaptcha:false`. 보안문자 요청이 발생한 것이 아니며 이를 우회하지 않음 |
| 파일 HEAD | 200, `content-length=352699739`, ZIP attachment |
| 작은 범위 요청 | `Range: bytes=-65536`에 206 대신 200, `Content-Range` 없음, 전체 길이 반환. 본문 취소 |
| ZIP 앞부분 제한 열람 | 첫 청크 7,540바이트 및 후속 32,768바이트 한정 열람 후 취소, 메모리에서만 처리. 처음 파일은 `[필독]파일열람방법.txt`, 다음은 `소상공인시장진흥공단_상가(상권)정보_강원_202606.csv` |
| 첫 CSV 위치 | ZIP 로컬 헤더 offset 701, 압축 13,796,695바이트. 서울 CSV 위치·본문·6행은 읽지 못함 |
| 배포 이력 목록 | 공개 `selectHistAndCsvData.do` 응답에서 49개 과거 자료, 20260331 항목 확인. 원본 판 미상 상태에서 모든 분기를 내려받지 않음 |

재현용 [첨부 메타데이터 조회](https://www.data.go.kr/tcs/dss/selectFileDataDownload.do?publicDataPk=15083033&publicDataDetailPk=uddi%3Ab3094bc9-8756-4ecc-9141-9144b98a531e&atchFileId=&fileDetailSn=1&publicDataTyCode=PR0051)와 [배포 이력 조회](https://www.data.go.kr/tcs/dss/selectHistAndCsvData.do?publicDataPk=15083033&publicDataDetailPk=uddi%3Ab3094bc9-8756-4ecc-9141-9144b98a531e)는 읽은 공식 JS의 공개 조회 경로다. 다운로드 경로는 `/cmm/cmm/fileDownload.do`이며 위 첨부 ID/Sn과 `dataNm=소상공인시장진흥공단_상가(상권)정보_20260630`을 받는다. 본 연구에서 전체 ZIP/서울 CSV 해시는 확보하지 않았다. 부분 해시를 전체 배포판 해시로 쓰면 안 된다.

`SO-SEMAS-NOTICE`: [공단의 데이터 안내](https://bigdata.sbiz.or.kr/#/notice/384818589907726336), 실제 공개 응답 [pub/api/pst/384818589907726336](https://bigdata.sbiz.or.kr/pub/api/pst/384818589907726336), 02:02:43 KST GET 200, 게시 2025-11-27 21:32:05. 데이터 출처를 국세청/카드사, 포맷을 UTF-8 CSV, 제공 항목을 업소번호·상호·주소·경위도로 설명한다. 자료 계보의 일반 설명이며 각 6행의 좌표 생성법·측량 정확도를 증명하지 않는다. 게시물 열람 외 조회수 갱신·스크랩 경로는 호출하지 않았다.

`SO-SEMAS-API`: [공단 공식 OpenAPI 안내 15012005](https://www.data.go.kr/data/15012005/openapi.do), 02:02:55 KST GET 200, 수정 2026-08-14. 소량 행 조회의 별도 경로이나 활용신청/서비스 키가 필요한 계약이다. 이번에는 신청·인증·API 실행을 하지 않았다. 공식 검색에서 소량 서울 배포 파일을 추가 확보하지 못했으며 비공식 미러를 원배포 확인으로 대체하지 않았다.

### 이용조건·계보의 정확한 적용 범위

| 근거 | 이번에 확인한 것 | 여전히 남는 것 |
|---|---|---|
| [공공데이터포털 정책](https://www.data.go.kr/ugs/selectPortalPolicyView.do) + SO-SEMAS-META | 공개 데이터의 이용과 제3자 권리/개별 이용허락 구분, 해당 상가 배포판의 제한 없음 표시 | 최신 배포판과 Purpleo 6행의 실제 일치·Purpleo 취득 분기 |
| [Purpleo 출처·정정 정책](https://sav.purpleo.kr/data-policy) | 제공기관 원본을 표시 형식에 맞게 정리한다고 설명 | 6행별 수집일·원배포판·변환 이력 미표시 |
| [Purpleo 이용 안내](https://sav.purpleo.kr/terms) | 개별 표시 라이선스를 따르고, 미표시 자료는 원 제공자 조건을 확인하도록 안내 | 페이지 문장·사진·지도 타일 전체의 포괄 재배포 허락으로 해석 불가 |
| SO-TOURAPI-TERMS + SO-KTO-COPYRIGHT | OpenAPI로 선별 개방된 정보와 일반 웹 저작물의 조건을 구분 | 이번 ST06 웹 상세 응답의 개별 허락 표시는 미확인 |

## HTTP 응답 지문

SHA-256은 전송 압축 해제 후 `fetch(...).arrayBuffer()`의 바이트 기준이다. 동적 조회수·템플릿 때문에 전체 응답 해시는 변할 수 있다. 본문 전체를 로컬에 보관한 것이 아니므로 해시만으로 이후 원문을 복원할 수 없다. 필드 대조에는 아래 안정 subset 해시를 별도로 제공한다.

| source / 확인 KST | 응답 SHA-256 |
|---|---|
| SO-KTO-PAGE / 02:00:16 | `9be931b934635dd56bdd4656e3166bfb67efc2f4da330c081e2d29427f20dbd1` |
| SO-KTO-DETAIL / 02:00:39 | `360d8b8f2260aa3c0809f6475b82b3c39ec5a2d76d230c7431a29505131bb85f` |
| SO-KTO-DETAIL / 02:04:18 | `ef88be64b4a27bb2348f3e87fadcc4eaa7f4a9b7bb290a61fe10458152cf885b` |
| SO-P07-404 / 02:03:54 | `b45efa6ea08f0ddf5158ea8b4eb61419a413a4ef60cfb462243ee1bd895c8473` |
| P01 / 02:03:27 | `7dcbf96f91e0798935558619781bf21567df3fe1c57edd127c5da38185e1fb57` |
| P02 / 02:03:27 | `4a72af291ec5079be8bad54e7c673dddce18c6ccc552be248b0cc98bd9eb3151` |
| P03 / 02:03:27 | `2588a20163ee1519552a7dc6a2a6315471e26f43259907d134fef8dc45f10884` |
| P04 / 02:03:27 | `1bce2935cd7b41820eec27369514541b2710ace5eb7e39ff605578902afb6c47` |
| P05 / 02:03:27 | `4c1cc414ec4714bf72387b48d4ea262c813611fa2227d09a138ac836f8b6a9b6` |
| P09 / 02:03:27 | `da33d6ec4d45c6d21b6efc385f09c4aa9fceea3956ec64ae457cc957e660d8b0` |
| SO-SEMAS-META / 01:59:47 | `5160683ef6826676fdc46e0ae2725bbf5d2f2af4a883f42d5945c1be2f6fc1d4` |
| 첨부 메타데이터 조회 / 02:00:39 | `8327a1fbb9ba24fee7f2ee0fc511ed404a7a1673481832b33572b49ac69befbe` |
| 배포 이력 조회 / 02:00:40 | `8310747a1e1a601c825eb0c4829c45559d277071cfb5654ab61e1719a7100a7d` |
| 제한 검사 `needCaptcha:false` / 02:01:18 | `31dbc70a4bb28713e52ad286384185f515052bab33ecbbbd5796d0f3ba321283` |
| ZIP **앞 32,768바이트만** / 02:02:15 | `e4d76953fc7193ec251ee76f0f5a7008bf7fa4dae21ed7c46a67ecdbc679727d` |
| SO-SEMAS-NOTICE / 02:02:43 | `c5a0fb1813f1220992b003a0be1553a45c9053776b33636372f87c43d2d8dcb2` |
| SO-SEMAS-API / 02:02:55 | `e738e84e19a8dda82b7600a928ea5f733f0a08bbb23a03fe7e9cc088c07a8708` |
| 공공데이터포털 정책 / 02:00:49 | `a5883ced0433c1f46b4a0ed05d8f6254155740797cf534863f372bd5b9769b8b` |
| Purpleo 출처·정정 정책 / 02:00:03 | `40a274c0b0ef9ce8d10487ae6e0984f4f56f401c495d59cfafa25ab6eaa2df72` |
| Purpleo 이용 안내 / 02:00:03 | `210a246a82edb5e0a17e1782347ea885c038ee7b90c3916d3f1463025025eab0` |
| SO-TOURAPI-TERMS / 02:01:34 | `8680f28796cac0a7e73824beb81b33811fff327a224d39180c8ce908f4fe0325` |
| SO-KTO-COPYRIGHT / 02:03:53 | `633adf51cf9b445c12d3777e5715626aba097f76ae32ebbd4203f921747abd34` |

ST06는 응답에서 키 순서 `cid,cotId,title,addr1,mapY,mapX`로 문자열 값을 추출한 `JSON.stringify` UTF-8의 SHA-256이 두 조회 모두 `c1ed6735250694e6b5ff8d2903c52a52bde460a2795018a29f71007a0784552e`였다. 확인일이나 조회수는 포함하지 않는다.

Purpleo는 `storeId,rowId,sourceName,sourceAddress,latitude,longitude` 순서, 좌표는 JSON number로 추출한 `JSON.stringify` UTF-8다. sourceName은 P01 `지에스25역삼띵동점`, P02 `GS25역삼상록점`, P03 `지에스25역삼미래점`, P04 `GS25역삼넥스빌`, P05 `지에스25강남상록회관점`, P09 `GS25역삼대홍점`이며 주소는 위 도로명과 같다.

| subset | SHA-256 |
|---|---|
| P01 | `a254a8a1554df98c5cef66ac037edafd55973b04aa108d4eaf03c62dfb7281d2` |
| P02 | `d4b5d6911f99f43ca6cee230844ede523df2af4d39f6f0fcfe98d0e8cdfd4a25` |
| P03 | `ab9b080027232f1ad9ddd39a98e966a14d438599cc42410d974095f7d9db7e52` |
| P04 | `fa537574f2e50c43c41ee716b70dc52c7aa0465dfc9bd686e4080a98e06cf368` |
| P05 | `07f76aab5621fc44f1ebc833c577d85c1668a9c1cbd5365e6cf7deac264eaf63` |
| P09 | `5d1990b4f5503698842b3590637a24f32bfd6bfd6aff274db6ad02ba63020e3d` |

## main이 통합할 최소 변경안과 남은 일

**제안이며 이 조사자는 적용하지 않았다.**

1. ST06에 SO-KTO-PAGE/DETAIL URL·POST 조회 파라미터·확인시각·raw/필드 해시·`cid/cotId`·원좌표·소수 6자리 일치 근거를 별도 provenance source로 추가한다. `evidenceScope`는 동일 점포 식별과 `coordinate_comparison_only`부터 시작한다. P07의 404 이력과 `originalCoordinateRechecked:false`는 P07 직접 재열람 실패라는 의미로 보존하고, 공식 대조 성공은 별도 항목으로 기록한다. 기존 `coordinateSourceId=P07`을 바꿀지는 이용조건 적용을 검토한 데이터 소유자가 판단한다. 본 보고서는 교체 승인이 아니다.
2. 6곳의 source record에 `externalRowId`와 공개 페이지 날짜(2025-04-27, 페이지 self-report), 이번 확인일·응답/필드 해시, 공식 배포판 20260630의 조건 확인 링크를 보강할 수 있다. `originalDistributionRowVerified:false`를 유지하고 `upstreamDistributionVersion:unknown`을 명시한다. 페이지 날짜를 원배포일로 넣지 않는다.
3. 후속 공식 행 대조는 **공식 서울 CSV 또는 적법하게 접근 가능한 소량 공식 행 응답에서 위 6개 ID만** 추출하여 수행한다. `배포 기준일/파일명/파일 해시/원행 해시/업소번호/주소/좌표`를 남긴다. 최신 CSV가 일치해도 Purpleo의 역사적 취득 판까지 복원됐다고 하지 않는다. 이번 353MB 전체 ZIP 다운로드는 후속의 자동 선행조건으로 추가하지 않는다.
4. ST06 재이용을 확정해야 한다면 해당 레코드가 개방된 TourAPI 정보임을 권한이 있는 경로에서 확인하거나, 이 좌표 필드에 적용되는 개별 제공조건을 확인한다. 이번 연구에서 새 계정/키/담당자 연락을 요청하거나 수행하지 않는다. 이 미확인이 정상 요청 기능을 변경할 이유는 아니다.

| 조사 질문 → 후속 필드/시나리오 | 기대 결과 | 이번 상태 |
|---|---|---|
| `RC-ST-ORIGIN-01`: 6개 upstream 업소번호가 공식 원행과 같은가 → 원배포 버전/행 지문 | 같은 점포·현재 값 보존, 잘못된 primary verified 승격 금지 | 2차 값 6/6 일치, 공식 행 대조 0/6 실행 |
| `RC-ST-ORIGIN-02`: 끊어진 P07 좌표를 공식 source에서 찾을 수 있는가 → ST06 provenance | 같은 ID/좌표 유지, P07 장애와 공식 좌표 대조를 구분 | 공식 웹 응답 대조 완료; 역사적 ETL/개별 재이용 미확인 |
| 공개 dev 제안 `SC-ST-ORIGIN-01` | provenance만 보강 후 8개 점포 ID/좌표와 거래 FK·기존 snapshot 연결 불변 | 합성 검사 제안, 앱/DB 테스트 미실행 |

목적 보존: 현재 점포 선택·요청·동의·경영주 관계·거래·snapshot·48시간에 쓰이는 ID와 좌표를 건드리지 않았다. 실제 영업·재고·출입구 정확도·전체 라이선스 준수·G4/G5/G6는 이번 연구의 판정 대상이 아니다. 상태는 `ready_with_hypotheses / official_six_rows_refresh_required`이며, 본 보고서가 전체 데이터 요구 충족을 뜻하지 않는다. PROGRESS 갱신과 구현·독립 검증은 main에 인계한다.

마감 확인: **2026-09-22 02:07:07 KST**, 시작 후 **7분 52초**, 10분 상한 안에서 조사 종료. EVAL-01·stores·provenance·기존 store-evidence의 파일 해시가 입력값과 같음을 확인했다. 문서의 6개 업소번호, ST06 좌표, SHA-256 표기와 줄 끝 공백을 확인했다. 이는 문서·입력 보존 확인이며 앱 테스트/독립 최종 QA가 아니다. 이 마감 문구를 반영한 뒤 문서 소유권을 반환한다.
