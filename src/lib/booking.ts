// Pricing, slot availability, booking statuses and saved bookings. No backend yet.
import { readJSON, writeJSON } from "./storage.ts";

export const PAYMENT_METHODS = [
  { id: "qris", label: "QRIS", note: "Semua aplikasi bank & e-wallet", tag: "QRIS", fee: 0, feePct: 0 },
  { id: "ewallet", label: "E-Wallet", note: "GoPay · DANA · OVO", tag: "Pay", fee: 0, feePct: 0 },
  { id: "bca", label: "BCA Virtual Account", note: "Biaya Rp6.000", tag: "BCA", fee: 6_000, feePct: 0 },
  { id: "mandiri", label: "Mandiri Virtual Account", note: "Biaya Rp6.000", tag: "Mandiri", fee: 6_000, feePct: 0 },
  { id: "card", label: "Kartu Debit / Kredit", note: "Biaya 2,9% + Rp2.000", tag: "Kartu", fee: 2_000, feePct: 2.9 },
] as const;
export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]["id"];

export const VOUCHERS: Record<string, { pct: number; max: number }> = {
  INASPORT10: { pct: 10, max: 15_000 },
};

export function findVoucher(code: string) {
  return VOUCHERS[code.trim().toUpperCase()];
}

export function quote(subtotal: number, method: PaymentMethodId, voucherCode = "") {
  const m = PAYMENT_METHODS.find((p) => p.id === method) ?? PAYMENT_METHODS[0];
  const fee = m.fee + Math.round((subtotal * m.feePct) / 100);
  const v = findVoucher(voucherCode);
  const discount = v ? Math.min(Math.round((subtotal * v.pct) / 100), v.max) : 0;
  return { subtotal, fee, discount, total: subtotal + fee - discount };
}

export const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** Local calendar date as YYYY-MM-DD (not UTC, so late-night Jakarta stays on the right day). */
export function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" }) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", opts).format(new Date(y, m - 1, d));
}

// ponytail: fake occupancy (~30% booked) from a stable hash, so the grid looks lived-in.
// Replace with a real availability query when bookings move to a database.
export function isBookedByOthers(slug: string, courtId: string, date: string, hour: number) {
  let h = 2166136261;
  for (const ch of `${slug}|${courtId}|${date}|${hour}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) % 100 < 30;
}

export type BookingStatus = "pending" | "paid" | "cancelled" | "expired";
/** What the UI shows: stored status plus time (an unpaid hold runs out, a paid hour ends). */
export type ShownStatus = "pending" | "paid" | "done" | "cancelled" | "expired";

export type Booking = {
  id: string;
  userEmail?: string; // v1 demo bookings have none and are ignored (PRD: not imported)
  status?: BookingStatus; // v1 bookings have none: treated as paid
  venueSlug: string;
  courtId: string;
  date: string;
  hour: number;
  name: string;
  email: string;
  phone: string;
  team?: string;
  method: PaymentMethodId;
  voucher?: string;
  subtotal: number;
  fee: number;
  discount: number;
  total: number;
  createdAt: string;
  holdExpiresAt?: string;
  paidAt?: string;
  cancelledAt?: string;
};

export const HOLD_MINUTES = 10;
export const CANCEL_HOURS = 2;

export const STATUS_LABEL: Record<ShownStatus, string> = {
  pending: "Menunggu pembayaran",
  paid: "Lunas",
  done: "Selesai",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
};

/** Local start time of the booked hour. */
export function slotStart(b: Pick<Booking, "date" | "hour">) {
  const [y, m, d] = b.date.split("-").map(Number);
  return new Date(y, m - 1, d, b.hour);
}

export function shownStatus(b: Booking, now = new Date()): ShownStatus {
  const s = b.status ?? "paid";
  if (s === "pending" && b.holdExpiresAt && new Date(b.holdExpiresAt) <= now) return "expired";
  if (s === "paid" && slotStart(b).getTime() + 3_600_000 <= now.getTime()) return "done";
  return s;
}

/** Holds the slot: unpaid within the hold, paid, or already played. */
export const isActive = (b: Booking, now = new Date()) => ["pending", "paid", "done"].includes(shownStatus(b, now));

/** PRD F6: cancel up to 2 hours before the start. */
export function canCancel(b: Booking, now = new Date()) {
  const s = shownStatus(b, now);
  return (s === "paid" || s === "pending") && slotStart(b).getTime() - now.getTime() >= CANCEL_HOURS * 3_600_000;
}

export const slotKey = (slug: string, courtId: string, date: string, hour: number) =>
  `${slug}|${courtId}|${date}|${hour}`;

/** Taken by the fake crowd or by any active booking in this browser. */
export function isSlotTaken(slug: string, courtId: string, date: string, hour: number, bookings: Booking[], now = new Date()) {
  const k = slotKey(slug, courtId, date, hour);
  return isBookedByOthers(slug, courtId, date, hour) || bookings.some((b) => slotKey(b.venueSlug, b.courtId, b.date, b.hour) === k && isActive(b, now));
}

/** "Pesan lagi": the nearest day (today included) in the 7-day window with the same weekday. */
export function nextSameWeekday(date: string, now = new Date()) {
  const want = slotStart({ date, hour: 0 }).getDay();
  for (let k = 0; k < 7; k++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + k);
    if (d.getDay() === want) return isoDate(d);
  }
  return isoDate(now);
}

/** Demo VA number: bank prefix + digits derived from the booking code. */
export function vaNumber(b: Pick<Booking, "id" | "method">) {
  const digits = [...b.id].map((c) => c.charCodeAt(0) % 10).join("").slice(-10).padStart(10, "0");
  return `${b.method === "bca" ? "39358" : "89608"}${digits}`;
}

const KEY = "ina-bookings";

// ponytail: bookings live in this browser's localStorage only. Move them to a database for real use.
export const loadBookings = () => readJSON<Booking[]>(KEY, []);

export function saveBooking(b: Booking) {
  writeJSON(KEY, [b, ...loadBookings()]);
}

export function updateBooking(id: string, patch: Partial<Booking>) {
  writeJSON(KEY, loadBookings().map((b) => (b.id === id ? { ...b, ...patch } : b)));
}

/** Account deleted: keep the records for finance, drop the link to the person. */
export function forgetUser(email: string) {
  writeJSON(KEY, loadBookings().map((b) => (b.userEmail === email ? { ...b, userEmail: undefined, name: "Akun dihapus", email: "", phone: "" } : b)));
}
