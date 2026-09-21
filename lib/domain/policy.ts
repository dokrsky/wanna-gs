// Single source of the adopted demo limits, not real GS operating policy.
export const DOMAIN_POLICY = Object.freeze({
  version: "ADR-003-v1", maxRequestQuantity: 20, consentMs: 7 * 86400000,
  pickupMs: 48 * 3600000, maxClockAdvanceMs: 30 * 86400000, maxBudgetWon: 1_000_000_000,
});
export class DomainError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}
export function requireRule(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) throw new DomainError(code, message);
}
export const integer = (n: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): n is number => Number.isSafeInteger(n) && Number(n) >= min && Number(n) <= max;
export const identifier = (s: unknown): s is string => typeof s === "string" && /^[a-zA-Z0-9_.:-]{1,180}$/.test(s);
export function sum(values: number[]) {
  const total = values.reduce((a, b) => a + b, 0);
  requireRule(integer(total), "INVALID_AMOUNT", "수량 또는 금액 범위를 확인해주세요.");
  return total;
}
export function amount(quantity: number, unit: number) {
  requireRule(integer(quantity) && integer(unit) && integer(quantity * unit), "INVALID_AMOUNT", "정수 수량·금액 범위를 확인해주세요.");
  return quantity * unit;
}
