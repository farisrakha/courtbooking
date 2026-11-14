// Browser storage helpers shared by the demo auth and bookings.
// ponytail: localStorage stands in for the database until PRD phase 1 (Clerk + Postgres).

export const STORE_EVENT = "ina-store";

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown) {
  if (value === undefined) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify(value));
  // `storage` only fires in other tabs; this tells components in this tab to re-read.
  window.dispatchEvent(new Event(STORE_EVENT));
}
