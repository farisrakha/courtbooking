"use client";

import { useMemo, useSyncExternalStore } from "react";
import { currentUser, type User } from "./auth";
import type { Booking } from "./booking";
import { STORE_EVENT } from "./storage";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb); // other tabs and the /preview frames
  window.addEventListener(STORE_EVENT, cb); // this tab
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(STORE_EVENT, cb);
  };
}

/** Raw localStorage value that re-renders on change. Server snapshot is null. */
function useRaw(key: string) {
  return useSyncExternalStore(subscribe, () => localStorage.getItem(key), () => null);
}

export function useUser(): User | null {
  const users = useRaw("ina-users");
  const session = useRaw("ina-session");
  return useMemo(() => currentUser(JSON.parse(users ?? "{}"), JSON.parse(session ?? "null")), [users, session]);
}

/** Every booking in this browser. Filter by `userEmail` for "mine". */
export function useBookings(): Booking[] {
  const raw = useRaw("ina-bookings");
  return useMemo(() => (raw ? (JSON.parse(raw) as Booking[]) : []), [raw]);
}
