import catalog from "../data/catalog.json" with { type: "json" };
import stores from "../data/stores.json" with { type: "json" };
import availability from "../data/availability.json" with { type: "json" };
import actors from "../data/actors.json" with { type: "json" };

// DATA-02: one product master for model + SQLite. DATA-01 facts remain partly unverified;
// prices/supply/actors/consent are simulated, not the final domain/verified GS catalog.
export type PreviewProduct = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  emoji: string;
  color: string;
  aliases: string[];
  identityOrigin?: string;
  sourceIds?: string[];
  sourceConfidence?: string;
  verifiedFields?: string[];
  fieldOrigins?: Record<string, string>;
  size?: string | null;
};

export const previewProducts: PreviewProduct[] = catalog;

export type PreviewStore = {
  id: string;
  name: string;
  address: string;
  identityOrigin?: string;
  latitude?: number;
  longitude?: number;
  sourceIds?: string[];
  confidence?: string;
};

export const previewStores: PreviewStore[] = [
  // Keep legacy IDs and order: never silently remap saved requests or the default selection.
  { id: "demo-central", name: "GS25 원하데모점", address: "화면 시연용 가상 점포 · 실제 위치 아님", identityOrigin: "synthetic", sourceIds: ["LOCAL-PREVIEW"] },
  { id: "demo-neighborhood", name: "GS25 골목데모점", address: "화면 시연용 가상 점포 · 실제 위치 아님", identityOrigin: "synthetic", sourceIds: ["LOCAL-PREVIEW"] },
  ...stores,
];

// Only configured real-store rows. Missing is unknown/not_configured, never false/zero stock.
export const previewAvailability = availability;
export const previewActors = actors;

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
  ...previewActors.filter(actor => actor.role === "customer").map((actor, index): PreviewRequest => {
    const store = stores[index % stores.length];
    const options = previewAvailability.filter(row => row.storeId === store.id && row.requestable);
    const row = options[(index * 7) % options.length];
    return { id: `data02-sample-${String(index + 1).padStart(2, "0")}`, actor: actor.displayName,
      productId: row.productId, storeId: row.storeId, quantity: 1 + index % 3,
      unitPrice: row.unitPrice, consent: true, createdAt: `2026-09-21T10:${String(index).padStart(2, "0")}:00+09:00`,
      stage: "requested" }; // Authored demand/consent only; no automatic approval or fulfillment.
  }),
];

export const won = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;
