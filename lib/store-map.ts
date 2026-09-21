import publicStores from "../data/stores.json" with { type: "json" };
import type { PreviewStore } from "../app/demo-preview";

export const SIMULATED_CUSTOMER_POINT = Object.freeze({ latitude: 37.5045, longitude: 127.041 });
const MAP_LATITUDE_LIMIT = 85.05112878;

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function validMapBounds(value: unknown): value is [number, number, number, number] {
  if (!Array.isArray(value) || value.length !== 4 || !value.every(finiteNumber)) return false;
  const [west, south, east, north] = value;
  return west >= -180 && east <= 180 && south >= -MAP_LATITUDE_LIMIT && north <= MAP_LATITUDE_LIMIT
    && west < east && south < north;
}

export function distanceFromSimulatedPoint(latitude: number, longitude: number): number | null {
  if (!finiteNumber(latitude) || !finiteNumber(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const start = SIMULATED_CUSTOMER_POINT;
  const a = Math.sin(radians(latitude - start.latitude) / 2) ** 2
    + Math.cos(radians(start.latitude)) * Math.cos(radians(latitude))
    * Math.sin(radians(longitude - start.longitude) / 2) ** 2;
  // Bound floating-point roundoff only; never repair input coordinates or bounds.
  return Math.round(6_371_000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a)))));
}

export function getStoreMap(store: Pick<PreviewStore, "id" | "identityOrigin" | "latitude" | "longitude">) {
  const { latitude, longitude } = store;
  if (store.identityOrigin !== "reference_verified" || !finiteNumber(latitude) || !finiteNumber(longitude)) return null;
  const reference = publicStores.find(candidate => candidate.id === store.id && candidate.identityOrigin === "reference_verified");
  // Only registered public coordinates may leave the browser, never caller-supplied personal locations.
  if (!reference || reference.latitude !== latitude || reference.longitude !== longitude) return null;
  const bounds = [longitude - 0.006, latitude - 0.004, longitude + 0.006, latitude + 0.004];
  if (!validMapBounds(bounds)) return null;
  const distanceMeters = distanceFromSimulatedPoint(latitude, longitude);
  if (distanceMeters === null) return null;
  const url = new URL("https://www.openstreetmap.org/export/embed.html");
  url.search = new URLSearchParams({ bbox: bounds.join(","), layer: "mapnik", marker: `${latitude},${longitude}` }).toString();
  return { url: url.toString(), distanceMeters };
}
