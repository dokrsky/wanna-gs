// DATA-01: deterministic dev/demo data only. No app imports, network, DB, evaluation or holdout.
// Regenerate: node data/generate.mjs; read-only check: node data/generate.mjs --check
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const version = "DATA-01-20260921-v1";
const dataVersion = "DATA-02-20260922-v1";
const checkedAt = "2026-09-21"; // Calendar date, not an invented precise retrieval timestamp.
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const source = (id, url, publishedAt, evidenceScope, limitations, type = "manufacturer") =>
  ({ id, url, checkedAt, publishedAt, evidenceScope, limitations, type });

const sources = [
  source("S01", "https://www.gsretail.com/brand/our-neighborhood-gs", null, ["service_features"], "공식 UI의 재고찾기/예약/픽업 소개. 실제 재고 정확도·본 앱 연동 근거 아님.", "official_service"),
  source("S02", "https://www.gsretail.com/brand/gs25", null, ["store_name", "store_address"], "2026-09-21 공식 매장찾기에서 역삼/강남/언주역 검색. 영업 현장·출입구·현재 상품 취급 검증 아님.", "official_store"),
  source("S03", "https://www.mt.co.kr/amp/society/2026/09/08/2026090709475845306", "2026-09-08", ["reported_search_friction", "limited_period_interest"], "다점포 방문·재고 차이·무작위 동봉품에 관한 보도 사례. 전국 인기·현재 재고·개별 합성 상품의 인기 증거 아님.", "reporting"),
  source("S04", "https://www.mk.co.kr/news/all/12155628", "2026-09-17", ["situation_aware_product_discovery"], "GS 상품 탐색 기능에 관한 기자 본문. AI 요약 제외. 개별 상품의 출시/인기 근거 아님.", "reporting"),
  source("S05", "https://www.family.co.jp/company/news_releases/2025/20250710_01.html", "2025-07-10", ["merchant_ordering", "manual_exceptions"], "일본의 과거 기업 발표. GS 운영·본 앱 효과 검증이 아니며 예측 초과발주 방식은 채택하지 않음.", "official_comparison"),
  source("S06", "https://brand.nongshim.com/all_product/index", null, ["listed_product_name", "named_flavor_or_format"], "직접 읽은 공식 목록의 이름만 확인. 용량·GS 취급·출시일·현재 인기도 미확인."),
  source("S07", "https://www.otoki.com/product/product_cat_2nd?idx=1", null, ["listed_product_name", "named_format"], "공식 라면류 페이지. 용량·GS 취급·신규 출시 시점·인기도 미확인."),
  source("S08", "https://convpick.kr/events/gs25/2-plus-1", null, ["historical_catalog_discovery", "listed_product_name_and_size"], "2026-09-21 읽은 페이지의 행사 대상 월은 2026-08; 발행일은 불명. 9월 정보를 받지 못했다는 안내. 목록 표기만 관찰했으며 제조사 대조·현재 인기/가격/재고 근거 아님.", "secondary_catalog"),
  ...[
    ["P01", "38894"], ["P02", "39182"], ["P03", "40030"], ["P04", "35842"], ["P05", "41983"],
  ].map(([id, article]) => source(id, `https://sav.purpleo.kr/article/${article}`, null, ["public_coordinate", "address_match"], "소상공인 상가정보를 표방하는 2차 자료. RS 조사에서 좌표 본문 확인; 원배포판 날짜/라이선스 독립 대조 미완료. 실측 출입구 아님.", "secondary_public_data")),
  source("P07", "https://yoonoo.kr/travel/detail.php?contentid=3306541&page=4247", "2024-06-12", ["public_coordinate", "address_match"], "관광정보 2차 자료. API 갱신 표시 2026-01-24, 공식 점포 주소와 대조. 현재 영업 보장 아님.", "secondary_tourism"),
  source("P08", "https://mapcarta.com/N12843268937", null, ["public_coordinate", "named_station_poi"], "OSM node12843268937 기반. 지하 매장의 출입구 정확도/접근성 미확인. OSM 출처/ODbL 확인 필요.", "secondary_osm"),
  source("P09", "https://sav.purpleo.kr/article/33495", null, ["store_name", "store_address", "public_coordinate"], "2026-09-21 공개 본문의 GS25역삼대홍점/논현로63길19와 지도 링크 좌표를 직접 읽음. S02 공식 매장찾기와 이름·주소 일치. 원배포일·실측 출입구·실시간 영업 미확인.", "secondary_public_data"),
  source("LOCAL-PREVIEW", null, null, ["legacy_preview_contract"], "기존 화면 6개 ID/명칭 보존. 외부 상품 사실의 확인 근거 아님.", "local_contract"),
];

const categories = [
  ["도시락·김밥·주먹밥", "🍱", "#FFF1DC", [
    "들깨버섯밥 도시락|320g", "콩나물불고기 도시락|360g", "연근두부조림 도시락|330g", "고추장닭구이 도시락|350g", "깻잎참치 김밥|220g",
    "당근달걀 김밥|210g", "우엉유부 김밥|215g", "치즈불닭 주먹밥|110g", "매실멸치 주먹밥|105g", "곤드레나물 주먹밥|120g",
    "양배추제육 덮밥|340g", "표고장조림 덮밥|310g", "카레채소 볶음밥|300g", "파인애플새우 볶음밥|320g", "단호박영양밥 컵|200g",
    "렌틸콩잡곡밥 컵|210g", "오리훈제 쌈밥|300g", "구운두부 쌈밥|280g", "김치달걀 오므라이스|330g", "옥수수크림 리조또|270g",
    "바질가지 덮밥|310g", "감자소시지 볶음밥|320g", "닭가슴살 곡물볼|290g", "참깨당근 비빔밥|300g", "깍두기깻잎 볶음밥|315g",
  ]],
  ["샌드위치·버거·빵", "🥐", "#FFF4D9", [
    "사과치즈 샌드위치|150g", "달걀토마토 샌드위치|160g", "참치오이 샌드위치|155g", "단호박견과 샌드위치|145g", "바질두부 샌드위치|165g",
    "감자치킨 버거|180g", "표고불고기 버거|190g", "양배추새우 버거|175g", "가지치즈 파니니|170g", "고구마크림 파니니|160g",
    "밤팥 포카치아|120g", "올리브양파 포카치아|130g", "유자크림 소보로|95g", "옥수수치즈 소보로|100g", "흑임자우유 번|90g",
    "인절미크림 번|100g", "무화과호두 스콘|85g", "대추생강 스콘|80g", "복숭아홍차 머핀|90g", "당근견과 머핀|95g",
    "단감크림 와플|100g", "오렌지코코아 와플|105g", "쑥콩가루 베이글|115g", "시금치치즈 베이글|120g", "시나몬사과 토스트|140g",
  ]],
  ["컵라면·면류", "🍜", "#FFF1DC", [
    "표고들깨 컵국수|95g", "바질토마토 컵파스타|120g", "유자간장 비빔면|130g", "양배추된장 컵우동|160g", "김치메밀 비빔국수|150g",
    "대파참깨 컵라면|105g", "버섯고추장 컵수제비|180g", "옥수수크림 컵뇨키|170g", "홍합마늘 칼국수|190g", "들기름무순 소바|140g",
    "두부고추 볶음면|150g", "미역조개 쌀국수|95g", "시금치달걀 컵소면|100g", "청양감자 컵우동|165g", "새송이버섯 짜장면|170g",
    "닭곰탕 쌀국수|110g", "마늘알리오 컵스파게티|140g", "가지치즈 라자냐|210g", "토란들깨 칼국수|185g", "겨자오이 냉면|190g",
    "쑥갓어묵 잔치국수|160g", "칠리콩 볶음우동|175g", "레몬버터 링귀니|180g", "단호박크림 펜네|170g", "배무채 비빔당면|150g",
  ]],
  ["스낵·과자·초콜릿", "🍪", "#F4EAF8", [
    "구운양파 감자칩|55g", "청양옥수수 칩|60g", "대파크림 쌀과자|65g", "고추냉이 완두스낵|45g", "유자후추 팝콘|50g",
    "흑설탕 귀리쿠키|70g", "복숭아홍차 쿠키|75g", "쑥아몬드 비스킷|65g", "땅콩참깨 크래커|80g", "로즈마리 통밀스틱|60g",
    "대추호두 에너지바|40g", "살구캐슈 견과바|45g", "김부각 라이스칩|35g", "연근강황 칩|40g", "비트당근 칩|45g",
    "흑임자 초콜릿볼|48g", "레몬요거트 초콜릿|50g", "메밀크런치 초콜릿|55g", "딸기코코넛 웨하스|60g", "커피헤이즐넛 웨하스|65g",
    "라임민트 젤리|50g", "배생강 젤리|55g", "매실자두 캔디|45g", "귤피 캐러멜|50g", "구운콩 누룽지스낵|70g",
  ]],
  ["디저트·아이스크림", "🍨", "#FFECED", [
    "단호박 우유푸딩|120g", "흑임자 두유푸딩|110g", "귤홍차 젤리컵|130g", "사과계피 젤리컵|125g", "밤크림 모찌|80g",
    "쑥팥 찹쌀떡|90g", "대추견과 설기|100g", "자몽크림 치즈케이크|95g", "당근호두 컵케이크|110g", "유자바닐라 크레이프|120g",
    "청포도코코넛 타르트|85g", "살구요거트 타르트|90g", "백도우유 롤케이크|100g", "밤커피 티라미수|120g", "메밀초코 브라우니|90g",
    "옥수수크림 아이스바|80ml", "배생강 셔벗|100ml", "오미자 셔벗|110ml", "쑥라떼 아이스컵|120ml", "로즈마리레몬 아이스컵|115ml",
    "호두캐러멜 아이스샌드|90ml", "홍시우유 아이스모찌|70ml", "흑미콩가루 파르페|150ml", "무화과치즈 아이스콘|130ml", "바나나참깨 아이스볼|100ml",
  ]],
  ["음료·생수·차", "🧃", "#E1F6F3", [
    "오이레몬 워터|400ml", "배도라지 음료|250ml", "자두히비스커스 차|350ml", "청포도보리 차|400ml", "유자루이보스 차|350ml",
    "사과민트 탄산수|500ml", "라임바질 탄산수|450ml", "귤생강 에이드|300ml", "오미자배 에이드|320ml", "파인애플캐모마일 음료|300ml",
    "토마토당근 주스|250ml", "케일사과 주스|260ml", "비트레몬 주스|240ml", "복숭아우롱 차|350ml", "망고재스민 차|330ml",
    "대추보리 차|500ml", "볶은현미 차|450ml", "검정콩 차|400ml", "매실국화 차|350ml", "포도홍차 음료|300ml",
    "단감배 주스|250ml", "살구라임 에이드|310ml", "코코넛오렌지 음료|300ml", "수박레몬 음료|280ml", "국화꿀 차|300ml",
  ]],
  ["커피·우유·요거트", "🥛", "#E5F2FC", [
    "밤귀리 라떼|250ml", "흑임자 두유라떼|240ml", "바나나보리 라떼|230ml", "대추우유 라떼|250ml", "카카오현미 음료|250ml",
    "메이플넛 커피|280ml", "오렌지모카 커피|250ml", "참깨크림 커피|270ml", "시나몬귀리 커피|300ml", "코코넛바닐라 커피|260ml",
    "사과뮤즐리 요거트|150g", "살구호두 요거트|140g", "단감그래놀라 요거트|160g", "오미자 요거트|130g", "대추꿀 요거트|140g",
    "녹두 두유|200ml", "검은깨 두유|190ml", "단호박 두유|210ml", "쑥귀리 음료|240ml", "완두코코아 음료|220ml",
    "복숭아우유 푸딩음료|250ml", "멜론코코넛 우유음료|240ml", "홍시우유 음료|260ml", "매실마시는 요거트|180ml", "블루베리메밀 요거트|150g",
  ]],
  ["간편식·생활 소품", "🛍️", "#EAEFF5", [
    "두부가지 그라탕|220g", "김치버섯 만두|180g", "닭고기부추 완자|160g", "고구마치즈 핫도그|130g", "바질감자 수프|200g",
    "단호박병아리콩 수프|210g", "들깨버섯 떡볶이|250g", "토마토콩 스튜|230g", "마늘대파 어묵탕|260g", "양배추달걀 부침|180g",
    "옥수수치즈 감자전|170g", "고추장렌틸 소스|150g", "유자당근 샐러드|180g", "병아리콩 퀴노아샐러드|200g", "구운가지 후무스|130g",
    "접이식 장바구니 청록|1개", "무향 종이손수건|20매", "재생지 메모패드|1권", "미니 지퍼백|15매", "접이식 종이도시락 용기|3개",
    "빨대 세척솔|2개", "대나무 젓가락|5쌍", "휴대용 수저집|1개", "실리콘 컵받침|2개", "면 행주|3매",
  ]],
];

const fieldOrigins = origin => ({ id: "demo_internal_id", name: origin, size: origin,
  category: "curated", description: "synthetic_copy", aliases: "synthetic_search_helpers",
  price: "simulated", emoji: "presentation", color: "presentation" });
const makeProduct = (id, name, category, price, emoji, color, aliases, identityOrigin, sourceIds, size = null) => ({
  id, name, category, description: identityOrigin === "synthetic_product"
    ? "합성 시연 상품입니다. 실제 출시·판매 상품이 아니며 가격은 모의입니다."
    : "명칭 참고용 데모 상품입니다. GS 현재 판매·취급은 확인하지 않았으며 가격은 모의입니다.",
  price, emoji, color, aliases, size, identityOrigin, sourceIds,
  sourceConfidence: identityOrigin === "reference_verified" ? "high" : "unverified",
  verifiedFields: identityOrigin === "reference_verified" ? ["name"] : [],
  fieldOrigins: { ...fieldOrigins(identityOrigin), size: size === null ? "not_provided" : identityOrigin }, version,
  trend: { status: "not_claimed", confidence: "unverified", sourceIds: [], publishedAt: null },
});

const catalog = [
  makeProduct("milk", "매일우유 900ml", "커피·우유·요거트", 2800, "🥛", "#E5F2FC", ["우유", "매일", "milk"], "reference_unverified", ["LOCAL-PREVIEW"], "900ml"),
  makeProduct("noodle", "짜파게티 5입", "컵라면·면류", 4600, "🍜", "#FFF1DC", ["짜파게티", "짜장", "라면"], "reference_unverified", ["LOCAL-PREVIEW"], "5입"),
  makeProduct("snack", "초코송이 36g", "스낵·과자·초콜릿", 1500, "🍫", "#F4EAF8", ["초코송이", "초코", "과자"], "reference_unverified", ["LOCAL-PREVIEW"], "36g"),
  makeProduct("strawberry", "딸기 크림 샌드위치", "샌드위치·버거·빵", 3500, "🍓", "#FFECED", ["딸기", "크림", "샌드위치"], "synthetic_product", ["LOCAL-PREVIEW"]),
  makeProduct("bread", "버터 소금빵", "샌드위치·버거·빵", 2200, "🥐", "#FFF4D9", ["버터", "소금빵", "빵"], "synthetic_product", ["LOCAL-PREVIEW"]),
  makeProduct("coffee", "콜드브루 커피 300ml", "커피·우유·요거트", 2500, "☕", "#F0E9E3", ["커피", "콜드브루", "아메리카노"], "synthetic_product", ["LOCAL-PREVIEW"], "300ml"),
];

const verified = [
  ["라뽁구리큰사발면", 2, "S06"], ["바삭츄리 고튀", 3, "S06"], ["누룽지팝 매콤한맛", 3, "S06"],
  ["망고킥", 3, "S06"], ["신라면로제", 2, "S06"], ["신라면 로제 큰사발면", 2, "S06"],
  ["빵부장 말차빵", 3, "S06"], ["누들핏 새우탕맛", 2, "S06"], ["진라면 매운맛 봉지라면", 2, "S07"],
  ["참깨라면 컵", 2, "S07"], ["컵누들 매콤한맛", 2, "S07"], ["가뿐한끼 곤누들 비빔국수", 2, "S07"],
];
for (const [index, [name, categoryIndex, sourceId]] of verified.entries()) {
  const [category, emoji, color] = categories[categoryIndex];
  catalog.push(makeProduct(`DEMO-REF-${String(index + 1).padStart(3, "0")}`, name, category,
    1800 + index * 100, emoji, color, [name, ...name.split(" ")], "reference_verified", [sourceId]));
}
// Exact labels read from S08's August listing; not current popularity or release claims.
const historicalCandidates = [
  ["세아)킹오쨩103G", "103g", 3],
  ["오늘의)직화구운뼈없는닭발200G", "200g", 7],
  ["오늘의)직화로구운불막창200G", "200g", 7],
  ["오뚜기)버팔로봉200G", "200g", 7],
  ["CJ)스팸340G", "340g", 7],
  ["CJ)비비고새우왕교자315G", "315g", 7],
  ["세아)매콤달콤먹태구이40G", "40g", 3],
  ["담터)호두아몬드율무차15입", "15입", 5],
  ["청정원)프리미엄굴소스260G", "260g", 7],
  ["코주부)K육포30G", "30g", 3],
  ["CJ)비비고닭곰탕500G", "500g", 7],
  ["사조)마일드참치200G", "200g", 7],
  ["대림)랍스터킹128G", "128g", 7],
  ["오뚜기)새우볶음밥230G", "230g", 0],
  ["CJ)햇반단호박죽267G", "267g", 7],
  ["오뚜기)김치참치덮밥(컵밥)", null, 0],
  ["하림)직화닭가슴살갈비구이100G", "100g", 7],
  ["면사랑)까르보나라크림우동360G", "360g", 2],
  ["맵칼어묵떡볶이220G", "220g", 7],
  ["켈로그)콘푸로스트230G", "230g", 7],
  ["샘표)밥도둑메추리알장조림150G", "150g", 7],
  ["페리오휴대용치약칫솔세트", null, 7],
  ["삼립)트리플치즈부리또", null, 1],
  ["하림)오늘단백피스타치오바48G", "48g", 3],
];
for (const [index, [name, size, categoryIndex]] of historicalCandidates.entries()) {
  const [category, emoji, color] = categories[categoryIndex];
  const item = makeProduct(`DEMO-HIST-${String(index + 1).padStart(2, "0")}`, name, category,
    2000 + index * 100, emoji, color, [name, name.replaceAll(")", " ")], "reference_unverified", ["S08"], size);
  item.description = "2026년 8월 행사 목록에서 표기를 읽은 참고 후보입니다. 제조사 대조·현재 인기·출시는 미확인이고 가격은 모의입니다.";
  item.observedFields = size === null ? ["name"] : ["name", "size"];
  item.fieldOrigins.name = "secondary_listing_observed";
  item.fieldOrigins.size = size === null ? "not_provided" : "secondary_listing_observed";
  item.trend = { status: "historical_promotion_candidate", confidence: "unverified", sourceIds: ["S08"],
    publishedAt: null, evidencePeriod: "2026-08", candidateAsOf: checkedAt, actualLaunchDate: null,
    currentPopularityVerified: false, evidenceScope: "past_promotion_listing_only",
    limitation: "과거 행사 목록으로부터의 탐색 후보이며 최근 출시 또는 현재 인기 상품이라는 뜻이 아님." };
  catalog.push(item);
}
for (const [group, [category, emoji, color, items]] of categories.entries()) {
  for (const [index, text] of items.entries()) {
    const [label, size] = text.split("|");
    const item = makeProduct(`DEMO-SYN-${group + 1}-${String(index + 1).padStart(2, "0")}`,
      `데모 ${label} ${size}`, category, 1200 + ((group * 7 + index * 3) % 40) * 100,
      emoji, color, [label, ...label.split(" ")], "synthetic_product", [], size);
    catalog.push(item);
  }
}

// Only public identity/source fields are projected; research/dev scenarios never enter app assets.
const researchBytes = await readFile(new URL("../docs/research/goal-20260922/recent-products.json", import.meta.url));
const researchHash = createHash("sha256").update(researchBytes).digest("hex");
assert.equal(researchHash, "a1b134c5d2d01563fd62857d294e488b76e03098a64b4f02175078c0d017f051");
const research = JSON.parse(researchBytes);
const recent = research.candidates.filter(p => !["RP-018", "RP-019", "RP-020", "RP-021"].includes(p.id));
assert.equal(recent.length, 20);
const categoryIndex = { bread: 1, ice_cream: 4, frozen_dessert: 4, lunchbox: 0, prepared_side_dish: 7,
  kimbap: 0, rice_ball: 0, packaged_soup: 7, packaged_noodle_meal: 2, cup_beverage: 5, snack: 3 };
const recentSourceIds = new Set(recent.flatMap(p => p.source_ids));
for (const s of research.sources.filter(s => recentSourceIds.has(s.id))) sources.push({
  ...source(`RP-${s.id}`, s.url, s.published_at, ["reported_product_name_and_form", "release_evidence"], s.limits, s.source_type),
  checkedAt: s.checked_on, licenseOrUsageNote: s.license.usage,
});
for (const [i, p] of recent.entries()) {
  assert.equal(p.net_quantity, null); assert.equal(p.existing_catalog_match, null);
  assert.notEqual(p.release.status, "future_announced");
  const [category, emoji, color] = categories[categoryIndex[p.category]];
  const item = makeProduct(`DEMO-${p.id}`, p.name, category, 2000 + i * 100, emoji, color,
    [p.name, ...p.name.split(/\s+| — /).filter(word => word !== "—"), ...(p.category === "bread" ? ["민음사", "문학 빵"] : [])],
    "reference_verified", p.source_ids.map(id => `RP-${id}`));
  item.version = dataVersion;
  item.sourceConfidence = p.identity_confidence === "medium_reporting" ? "medium" : "high";
  item.fieldOrigins.name = "referenced_name_and_form";
  item.researchCandidateId = p.id;
  item.release = p.id === "RP-010" ? { date: null, precision: "unknown", status: "launch_announced_date_unknown",
    announcedAt: "2026-09-03", actual_current_sale_checked: false, note: "9/3은 발표일이며 개별 정식 출시일은 미확인." } : { ...p.release };
  if (p.id === "RP-011") Object.assign(item.release, { status: "mentioned_date_tense_mixed_unconfirmed", note: "9/1 출시일 언급·시제 혼재·실판매 미확인" });
  const releaseLabel = p.id === "RP-010" ? "9/3 출시 발표만 확인한(정식 출시일 미확인)" : p.id === "RP-011"
    ? "9/1 출시일 언급·시제 혼재·실판매 미확인인" : p.release.status === "reported_released" ? "출시 보도·발표 근거가 있는" : "출시 일정 발표만 확인한(실출시 미확인)";
  item.description = `${releaseLabel} 명칭·형태 참고 상품입니다. 규격·현재 판매·점포 재고·인기는 미확인이며 가격·공급은 모의입니다.`;
  item.trend = { status: "recent_referenced_name", confidence: "unverified", sourceIds: item.sourceIds,
    publishedAt: research.sources.find(s => s.id === p.source_ids[0]).published_at,
    currentPopularityVerified: false, limitation: "출시 근거와 현재 인기·점포 재고는 별개입니다. 기업의 제품군 실적을 개별 상품에 귀속하지 않습니다." };
  catalog.push(item);
}

const officialStoreSources = [
  ["SE-GS-Y", "역삼", "e239e092954154b6a01054940047aeed6075a1c7cc5161f1251a7c5ab3f3ffe4"],
  ["SE-GS-S", "강남상록회관", "db18bcb558c306a47b334ea369852f745b6ee994fb5a17407f634c40fd376594"],
  ["SE-GS-D", "강남동원", "e5fbf7748285a75f8db98d74d39c3a5177bf831cc7b47f996752a4a2e6cb5a0f"],
  ["SE-GS-E", "S9언주역", "02628ea0d4107d54b30b1e1463903ee44fa8fb997f5ef7324702026a22f3eb99"],
];
for (const [id, query, responseSha256] of officialStoreSources) sources.push({
  ...source(id, `https://www.gsretail.com/api/homepage/brand/storeSearch/selectGs25Stores?shopName=${encodeURIComponent(query)}`,
    null, ["store_name", "store_address", "coordinate_comparison_only"],
    "공식 공개 응답의 상호·주소 대조. CRS·실측 정확도·갱신일·재사용 조건 미기재. 현재 영업·재고 보장 아님.", "official_store"),
  checkedAt: "2026-09-22", responseSha256, crossCheck: "researcher_and_main_matching_response_hash",
});
sources.find(s => s.id === "P07").limitations += " 2026-09-22 재조회 HTTP 404. 기존 좌표 원문 재확인 미완료; 공식 SE-GS-D는 상호·주소의 별도 근거입니다.";
sources.push({ ...source("SE-OSM-NODE", "https://api.openstreetmap.org/api/0.6/node/12843268937.json", "2025-08-05T08:40:57Z",
  ["named_station_poi", "coordinate_comparison_only"], "node version5. 주소·층·출입구·실측 태그 없음. 현재 영업 미확인; 기존 좌표 유지.", "openstreetmap"),
  checkedAt: "2026-09-22", licenseOrUsageNote: "OpenStreetMap contributors / ODbL: https://www.openstreetmap.org/copyright . 전체 seed의 재배포 준수 판정은 별도." });

const storeRows = [
  ["DEMO-ST-01", "GS25역삼띵동점", "언주로98길 7, 1층", 37.505154, 127.042457, "P01"],
  ["DEMO-ST-02", "GS25역삼상록점", "테헤란로43길 12, 101호", 37.504081, 127.043994, "P02"],
  ["DEMO-ST-03", "GS25역삼미래점", "테헤란로39길 51, 1층", 37.505686, 127.040274, "P03"],
  ["DEMO-ST-04", "GS25역삼넥스빌점", "언주로86길 11, 1층", 37.501946, 127.044264, "P04"],
  ["DEMO-ST-05", "GS25강남상록회관점", "언주로98길 25", 37.504901, 127.043938, "P05"],
  ["DEMO-ST-06", "GS25강남동원점", "테헤란로77길 7, 동원빌딩", 37.506979, 127.054510, "P07"],
  ["DEMO-ST-07", "GS25S9언주역점", "봉은사로지하 201, 지하1층 926-1호", 37.50753, 127.03404, "P08"],
  ["DEMO-ST-08", "GS25역삼대홍점", "논현로63길 19", 37.492469, 127.039295, "P09"],
];
const stores = storeRows.map(([id, name, address, latitude, longitude, coordinateSourceId]) => ({
  id, name, address: `서울 강남구 ${address}`, latitude, longitude, sourceIds: ["S02", coordinateSourceId],
  confidence: coordinateSourceId === "P08" ? "low" : "medium", identityOrigin: "reference_verified", checkedAt, coordinateSystem: "WGS84",
  coordinateSourceId, coordinateAccuracy: "address_or_poi_not_surveyed_entrance", operatingNowVerified: false,
  limitations: "실제 점포 위치 참고. 상품·가격·취급·재고·경영주 관계는 모두 모의이며 실시간 영업을 보장하지 않음.",
}));
const storeEvidence = [
  ["SE-GS-Y", "VS089", 1.82], ["SE-GS-Y", "VX051", 3.37], ["SE-GS-Y", "VDZ92", 2.82], ["SE-GS-Y", "V2300", 9.75],
  ["SE-GS-S", "VJH73", 0.27], ["SE-GS-D", "V1049", 9.96], ["SE-GS-E", "VGC22", 18.79], ["SE-GS-Y", "V3831", 6.35],
];
stores.forEach((store, i) => {
  const [sourceId, externalShopCode, coordinateDifferenceMeters] = storeEvidence[i];
  store.sourceIds.push(sourceId, ...(i === 6 ? ["SE-OSM-NODE"] : []));
  store.checkedAt = "2026-09-22";
  store.evidenceUpdate = { sourceId, externalShopCode, verifiedFields: ["name", "address"], coordinateDifferenceMeters,
    coordinateComparison: "공개 자료 간 거리 차이, 실측 오차/정확도 아님", officialCrsVerified: false, officialReuseTermsVerified: false,
    originalCoordinateRechecked: i !== 5, originalDistributionRowVerified: false };
  store.limitations += " 공식 상호·주소 재대조, 기존 좌표 유지. 원배포 행·재사용 조건 전체 대조 미완료.";
  if (i === 5) store.limitations += " 기존 좌표 출처 P07은 2026-09-22 HTTP 404로 재확인하지 못함.";
});
const actors = [
  ...Array.from({ length: 20 }, (_, i) => ({ id: `DEMO-CUSTOMER-${String(i + 1).padStart(2, "0")}`,
    role: "customer", displayName: `합성 고객 ${String(i + 1).padStart(2, "0")}`, origin: "synthetic", realPerson: false })),
  ...stores.map(store => ({ id: `DEMO-MERCHANT-${store.id}`, role: "merchant", displayName: `합성 경영주 ${store.id.slice(-2)}`,
    storeId: store.id, origin: "synthetic", realPerson: false, actualStoreAffiliation: false })),
];

// ponytail: deterministic, sparse 2-store placement; not a sales forecast or actual stock feed.
const availability = catalog.flatMap((product, i) => [...new Set([i % stores.length, (i + 3) % stores.length])].map((j, k) => {
  const supplyStatus = i % 17 === 0 && k === 1 ? "unavailable" : i % 11 === 0 && k === 1 ? "unknown" : i % 7 === 0 ? "limited" : "available";
  return { storeId: stores[j].id, productId: product.id, requestable: supplyStatus === "available" || supplyStatus === "limited",
    unitPrice: product.price, unitCost: Math.floor(product.price * 0.65 / 100) * 100,
    moq: i % 3 === 0 ? 6 : 1, packSize: i % 3 === 0 ? 6 : 1, supplyStatus,
    origin: "simulated", sourceIds: [], version: product.version, stockQuantity: i % 5 === 0 ? 0 : (i + k) % 9,
    supplyQuantity: supplyStatus === "unavailable" ? 0 : supplyStatus === "unknown" ? null : supplyStatus === "limited" ? 6 : 24,
    observedAt: "2026-09-21T09:00:00+09:00", observedAtOrigin: "simulated_clock", };
}));

const scenarioRows = [
  ["exact-confirm", "정확한 후보에서 상품·수량·점포·가격·자동구매 동의를 확인한다.", "확인한 카탈로그 ID만 요청하고 UI와 저장 내용이 일치한다.", ["CORE-03", "CORE-04"], ["S06"]],
  ["ambiguous-correct", "비슷한 맛/형태 후보를 비교하고 잘못된 후보를 거절한다.", "임의 확정 없이 차이를 설명하고 정정 또는 미식별 경로를 제공한다.", ["CORE-03", "CORE-11"], ["S03", "S06"]],
  ["unknown-need", "찾을 수 없는 상품의 니즈를 잃지 않는다.", "가짜 상품코드를 생성하지 않고 미식별은 유효 발주 수량에 포함하지 않는다.", ["CORE-11"], ["S03"]],
  ["alternative-consent", "대체 제안과 기존 요청을 구분한다.", "대체 노출/선택만으로 기존 SKU·점포·가격·동의를 바꾸지 않는다.", ["CORE-04", "CORE-25"], ["S03"]],
  ["stock-vs-supply", "재고 없음과 발주/공급 가능 여부를 구분한다.", "모의 재고 0만으로 생산 종료를 단정하거나 확보를 보장하지 않는다.", ["CORE-07", "CORE-25"], ["S01", "S03"]],
  ["batch-budget", "경영주가 요청을 묶어 예산/제외 조건으로 수정한다.", "유효 미확보 수요·예산·MOQ·배수 내에서만 제안/실행하며 이번 묶음과 지속 정책을 구분한다.", ["CORE-05", "CORE-06"], ["S05"]],
  ["above-moq", "목표를 넘어 들어온 유효 요청을 보존한다.", "MOQ는 접수 상한이 아니며 초과 수요를 저장하되 발주는 보수적 범위를 지킨다.", ["CORE-06", "CORE-25"], []],
  ["fifo-repeat", "요청 순서와 동일 명령 재전송의 수량을 보존한다.", "동일 요청/발주/배정은 중복되지 않고 공급량을 초과하지 않는다. 부분배정 상세는 채택 정책을 따른다.", ["CORE-08"], []],
  ["consent-payment", "확보 뒤 가격/동의 조건을 다시 확인한다.", "가격·동의 불일치 또는 모의 결제 실패를 예약 성공으로 표시하지 않는다.", ["CORE-04", "CORE-09"], []],
  ["pickup-clock", "입고 뒤 픽업 가능 시점을 이해한다.", "입고 전 픽업 가능 아님. 알림 생성부터 48시간이며 반복 이벤트로 마감을 연장하지 않는다.", ["CORE-07", "CORE-10"], ["S01"]],
  ["merchant-details", "상품별 합계에서 허용된 고객별 요청 상세를 확인한다.", "집계와 상세 합계가 같고 다른 점포 정보/실제 개인정보를 노출하지 않는다.", ["CORE-26"], ["S05"]],
  ["storage-reset", "저장 실패·새로고침·명시적 reset 후 상태를 이해한다.", "저장 실패는 성공 표시 없이 직전 committed 상태를 유지하며 손상 사본은 자동 초기화하지 않는다.", ["CORE-17"], []],
];
const scenarios = scenarioRows.map(([family, purpose, expected, coreIds, sourceIds], i) => ({
  id: `SC-DATA-${String(i + 1).padStart(2, "0")}`, family, purpose, expected, coreIds, sourceIds,
  origin: "synthetic_expansion", audience: "developer_only", status: "planned_not_executed", version,
  limitations: "고객 실제 발화·보호 평가셋·정답 라벨 아님. 앱/모델에 import하지 말고 공개 개발 목적 서술로만 사용.",
}));

const provenance = {
  version: dataVersion, researchVersion: "DATA-02-RECENT-20260922-v1", generatedFor: "dev-demo-not-release-verified", checkedAt: "2026-09-22",
  integration: { researchHash, storeReportHash: "3206975577946f4d443465c151a8207bd6bd8fcbba8cbdc68e90bb60900b3578",
    appendedIds: recent.map(p => `DEMO-${p.id}`), excludedCandidates: ["RP-018", "RP-019", "RP-020", "RP-021"],
    originalProducts: 242, originalConditions: 484, originalConditionVersion: version, releaseDataQa: "pending_independent_review" },
  factualCorrections: [
    { candidateId: "RP-010", basis: "Independent DATA-02 fact review of S03", correction: "2026-09-03은 발표일. 정식 출시일 null/unknown; frozen 연구 원본은 감사 이력으로 보존." },
    { candidateId: "RP-011", basis: "Independent DATA-02 fact review of S04", correction: "9/1 출시일 언급·시제 혼재·실판매 미확인. 완료/예정 중 하나로 단정하지 않음." },
  ],
  sources, candidatePolicy: "24개는 S08의 2026-08 행사 목록에서 이름을 직접 읽은 과거 행사 기반 관심 후보. 실제 출시·현재 인기 24개 확인을 뜻하지 않음.",
  absenceSemantics: "availability 행 누락은 unknown/not_configured이며 실제 미취급 증거가 아니다.",
  simulatedFields: ["all prices", "costs", "stocks", "supply", "moq", "packSize", "requestable", "actors", "transactions"],
  legacyVirtualStores: [
    { id: "demo-central", name: "GS25 원하데모점", address: "화면 시연용 가상 점포 · 실제 위치 아님", origin: "synthetic", countsTowardRealStores: false },
    { id: "demo-neighborhood", name: "GS25 골목데모점", address: "화면 시연용 가상 점포 · 실제 위치 아님", origin: "synthetic", countsTowardRealStores: false },
  ],
  limitations: ["다수 합성 상품; 200개 실제 GS SKU 검증 아님", "브랜드 표본은 이름 확인과 규격 확인이 다름", "현재 인기·매출·영업/실제 재고 검증 없음", "SQLite 삽입·앱 통합·독립 검토 미실행", "후보 24개는 과거 행사 표기만 관찰; 최근 출시/현재 인기 근거는 미충족", "기존 RS 표본 ST08 아르누보 상호 불일치는 해당 점포 제외 후 역삼대홍점으로 교체; 원본 보고서 보존"],
  contentHashes: Object.fromEntries(Object.entries({ catalog, stores, actors, availability, scenarios }).map(([key, value]) => [key, hash(value)])),
};
const files = { catalog, stores, provenance, actors, availability, scenarios };

function check(data) {
  const { catalog: products, stores: locations, actors: people, availability: rows, provenance: meta, scenarios: cases } = data;
  const unique = values => assert.equal(new Set(values).size, values.length, "duplicate");
  unique(products.map(p => p.id)); unique(products.map(p => `${p.name}|${p.size ?? ""}`.normalize("NFKC").replace(/\s/g, "")));
  unique(locations.map(s => s.id)); unique(people.map(a => a.id)); unique(rows.map(a => `${a.storeId}:${a.productId}`));
  unique(locations.map(s => s.name)); unique(meta.sources.map(s => s.id));
  assert(products.length >= 200); assert(locations.length >= 8 && locations.length <= 12);
  const productIds = new Set(products.map(p => p.id)), storeIds = new Set(locations.map(s => s.id)), sourceIds = new Set(meta.sources.map(s => s.id));
  for (const s of meta.sources) { assert(s.id && s.checkedAt && s.evidenceScope.length && s.limitations); assert("url" in s && "publishedAt" in s); }
  for (const p of products) {
    for (const key of ["id", "name", "category", "description", "emoji", "color", "identityOrigin"]) assert(p[key]);
    assert(Number.isInteger(p.price) && p.price > 0 && p.fieldOrigins.price === "simulated"); assert(Array.isArray(p.aliases) && p.aliases.length);
    for (const id of [...p.sourceIds, ...p.trend.sourceIds]) assert(sourceIds.has(id));
    if (p.identityOrigin === "synthetic_product") assert(p.description.includes("合成") || p.description.includes("합성"));
  }
  for (const s of locations) { assert(s.latitude > 37.49 && s.latitude < 37.55 && s.longitude > 127.02 && s.longitude < 127.08); for (const id of s.sourceIds) assert(sourceIds.has(id)); }
  assert.equal(people.filter(a => a.role === "customer").length, 20);
  for (const person of people) { assert(person.origin === "synthetic" && person.realPerson === false && person.displayName); if (person.storeId) assert(storeIds.has(person.storeId)); }
  for (const s of locations) assert.equal(people.filter(a => a.role === "merchant" && a.storeId === s.id).length, 1);
  for (const row of rows) { assert(productIds.has(row.productId) && storeIds.has(row.storeId)); assert(row.origin === "simulated"); assert(row.unitPrice > row.unitCost && row.unitCost > 0); assert(row.moq > 0 && row.packSize > 0); }
  const density = rows.length / (products.length * locations.length);
  assert(density >= 0.20 && density <= 0.35); assert(cases.length >= 10);
  assert.equal(products.filter(p => p.trend.status === "historical_promotion_candidate").length, 24);
  for (const entry of cases) { assert(entry.purpose && entry.expected && entry.audience === "developer_only"); for (const id of entry.sourceIds) assert(sourceIds.has(id)); }
  for (const [key, value] of Object.entries({ catalog: products, stores: locations, actors: people, availability: rows, scenarios: cases })) assert.equal(hash(value), meta.contentHashes[key], `hash ${key}`);
  return { products: products.length, identityOrigins: Object.fromEntries([...new Set(products.map(p => p.identityOrigin))].map(origin => [origin, products.filter(p => p.identityOrigin === origin).length])), stores: locations.length,
    customers: 20, merchants: locations.length, availability: rows.length, density, scenarios: cases.length,
    historicalPromotionCandidates: products.filter(p => p.trend.status === "historical_promotion_candidate").length,
    releaseVerified: false };
}

if (process.argv.includes("--check")) {
  const existing = Object.fromEntries(await Promise.all(Object.keys(files).map(async name => [name, JSON.parse(await readFile(new URL(`${name}.json`, import.meta.url), "utf8"))])));
  for (const [name, value] of Object.entries(files)) assert.deepEqual(existing[name], value, `stale generated file: ${name}.json`);
  console.log(JSON.stringify({ check: "PASS", generatorMatchesFiles: true, ...check(existing) }, null, 2));
} else {
  // Runtime generation is scoped to these six data files only.
  check(files);
  for (const [name, value] of Object.entries(files)) await writeFile(new URL(`${name}.json`, import.meta.url), JSON.stringify(value, null, 2) + "\n");
  console.log(`Generated ${catalog.length} catalog entries and ${stores.length} stores.`);
}
