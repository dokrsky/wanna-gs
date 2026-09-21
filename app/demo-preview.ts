// 화면을 먼저 공유하는 중간 Preview 데이터. 최종 SQLite seed/거래 계약이 아니다.
export type PreviewProduct = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  emoji: string;
  color: string;
  aliases: string[];
};

export const previewProducts: PreviewProduct[] = [
  { id: "milk", name: "매일우유 900ml", category: "유제품", description: "냉장고에 늘 두고 싶은 기본 우유", price: 2800, emoji: "🥛", color: "#E5F2FC", aliases: ["우유", "매일", "milk"] },
  { id: "noodle", name: "짜파게티 5입", category: "라면", description: "주말 한 끼를 위한 짜장라면", price: 4600, emoji: "🍜", color: "#FFF1DC", aliases: ["짜파게티", "짜장", "라면"] },
  { id: "snack", name: "초코송이 36g", category: "과자", description: "작고 달콤한 초콜릿 과자", price: 1500, emoji: "🍫", color: "#F4EAF8", aliases: ["초코송이", "초코", "과자"] },
  { id: "strawberry", name: "딸기 크림 샌드위치", category: "화면 예시 상품", description: "딸기와 부드러운 크림 · 합성 상품", price: 3500, emoji: "🍓", color: "#FFECED", aliases: ["딸기", "크림", "샌드위치"] },
  { id: "bread", name: "버터 소금빵", category: "화면 예시 상품", description: "짭짤하고 고소한 빵 · 합성 상품", price: 2200, emoji: "🥐", color: "#FFF4D9", aliases: ["버터", "소금빵", "빵"] },
  { id: "coffee", name: "콜드브루 커피 300ml", category: "화면 예시 상품", description: "차갑게 즐기는 커피 · 합성 상품", price: 2500, emoji: "☕", color: "#F0E9E3", aliases: ["커피", "콜드브루", "아메리카노"] },
];

export const previewStores = [
  { id: "demo-central", name: "GS25 원하데모점", address: "화면 시연용 가상 점포 · 실제 위치 아님" },
  { id: "demo-neighborhood", name: "GS25 골목데모점", address: "화면 시연용 가상 점포 · 실제 위치 아님" },
];

export type PreviewRequest = {
  id: string;
  actor: string;
  productId: string;
  storeId: string;
  quantity: number;
  unitPrice: number;
  consent: boolean;
  createdAt: string;
  stage: "requested" | "approved";
};

export type PreviewDraft = Omit<PreviewRequest, "actor" | "createdAt" | "stage">;

export const previewRequests: PreviewRequest[] = [
  { id: "sample-1", actor: "합성 고객 01", productId: "strawberry", storeId: "demo-central", quantity: 2, unitPrice: 3500, consent: true, createdAt: "2026-09-21T09:00:00+09:00", stage: "requested" },
  { id: "sample-2", actor: "합성 고객 02", productId: "strawberry", storeId: "demo-central", quantity: 1, unitPrice: 3500, consent: true, createdAt: "2026-09-21T09:10:00+09:00", stage: "requested" },
  { id: "sample-3", actor: "합성 고객 03", productId: "milk", storeId: "demo-central", quantity: 2, unitPrice: 2800, consent: true, createdAt: "2026-09-21T09:20:00+09:00", stage: "requested" },
  { id: "sample-4", actor: "합성 고객 04", productId: "bread", storeId: "demo-central", quantity: 3, unitPrice: 2200, consent: true, createdAt: "2026-09-21T09:30:00+09:00", stage: "requested" },
];

export const won = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;
