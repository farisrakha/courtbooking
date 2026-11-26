// Pricing, slot availability, booking statuses and saved bookings. No backend yet.
import { readJSON, writeJSON } from "./storage.ts";
import { getVenue, type Court, type Package, type Room, type Venue } from "./venues.ts";

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

export const feeFor = (method: PaymentMethodId, amount: number) => {
  const m = PAYMENT_METHODS.find((p) => p.id === method) ?? PAYMENT_METHODS[0];
  return m.fee + Math.round((amount * m.feePct) / 100);
};

export function quote(subtotal: number, method: PaymentMethodId, voucherCode = "") {
  const fee = feeFor(method, subtotal);
  const v = findVoucher(voucherCode);
  const discount = v ? Math.min(Math.round((subtotal * v.pct) / 100), v.max) : 0;
  return { subtotal, fee, discount, total: subtotal + fee - discount };
}

export type Tier = "perorangan" | "klub";
export type Scheme = "lunas" | "dp";

// ponytail: placeholder tax rate, the brief only says "tarif belum termasuk pajak".
export const TAX_PCT = 10;
export const DP_PCT = 50;
export const DEPOSIT_PCT = 30; // Uang Jaminan, paid separately (info only in the demo)

export const LOADING_HALF_DAYS = 3; // UI-07: the first 3 persiapan/bongkar days cost 50%, later ones 100%
export const LOADING_MAX_SIDE = 3; // days pickable before and after the event

/** UI-07 (Lampiran I poin 11): persiapan & bongkar days. */
export const loadingCost = (price: number, days: number) =>
  Math.round(Math.min(days, LOADING_HALF_DAYS) * price * 0.5 + Math.max(days - LOADING_HALF_DAYS, 0) * price);

/** Event/Tribun (UI-09): rent × days + loading days + tax; DP 50% or full now; payment fee on what's paid now. */
export function eventQuote(price: number, days: number, scheme: Scheme, method: PaymentMethodId, loadDays = 0) {
  const subtotal = price * days;
  const loading = loadingCost(price, loadDays);
  const tax = Math.round(((subtotal + loading) * TAX_PCT) / 100);
  const base = subtotal + loading + tax;
  const due = scheme === "dp" ? Math.round((base * DP_PCT) / 100) : base;
  const fee = feeFor(method, due);
  return { subtotal, loading, tax, fee, discount: 0, total: base + fee, dueNow: due + fee, deposit: Math.round((subtotal * DEPOSIT_PCT) / 100) };
}

const dayOfWeek = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};
export const isWeekend = (iso: string) => [0, 6].includes(dayOfWeek(iso));
// ponytail: fixed-date national holidays only; moveable holidays need the yearly SKB 3 Menteri list.
const FIXED_HOLIDAYS = ["01-01", "05-01", "06-01", "08-17", "12-25"];
export const isHoliday = (iso: string) => FIXED_HOLIDAYS.includes(iso.slice(5));
/** "Weekend/Libur" tariff day (UI-05). */
export const isOffDay = (iso: string) => isWeekend(iso) || isHoliday(iso);
export const isPeak = (v: Venue, hour: number) => v.peakFrom != null && hour >= v.peakFrom;

/** UI-04/05: price of one retail block. Klub beats peak beats weekend beats the weekday price. */
export function retailPrice(v: Venue, c: Court, date: string, hour: number, tier: Tier = "perorangan") {
  const t = c.tariff;
  if (tier === "klub" && t.club) return t.club;
  if (t.peak && isPeak(v, hour)) return t.peak;
  if (t.weekend && isOffDay(date)) return t.weekend;
  return t.weekday;
}

/** Start hours of the retail blocks for a day (a visit is one block from open to close). */
export const blockHours = (v: Venue) => {
  const len = blockLength(v);
  return Array.from({ length: Math.floor((v.close - v.open) / len) }, (_, k) => v.open + k * len);
};
export const blockLength = (v: Venue) => (v.block === "visit" ? v.close - v.open : v.block);

/** UI-08: per-hour rooms cost price × hours, per-day rooms one day's price. */
export const roomPrice = (r: Room, hours: number) => (r.unit === "jam" ? r.price * hours : r.price);
/** Per-hour rooms (Ruang A–C) are only rented on working days. */
export const roomOpenOn = (r: Room, date: string) => r.unit === "hari" || !isOffDay(date);

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

const dayHash = (key: string) => {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) % 100;
};

// ponytail: fake event days (~15%) at venues that sell packages, so the event calendar has locked days.
export function isEventDayTaken(slug: string, date: string) {
  return !!getVenue(slug)?.packages?.length && dayHash(`${slug}|event|${date}`) < 15;
}

/**
 * ponytail: at venues that also sell events, the fake retail crowd only books on "busy days" (~25%, never a fake
 * event day). Those days are locked for events, so retail and event availability agree (UI-06).
 */
export function isRetailBusyDay(slug: string, date: string) {
  return !!getVenue(slug)?.packages?.length && !isEventDayTaken(slug, date) && dayHash(`${slug}|retail|${date}`) < 25;
}

/** `review`: special-tariff request waiting for an LPUK admin (UI-10); no payment yet. */
export type BookingStatus = "review" | "pending" | "paid" | "cancelled" | "expired";
/** What the UI shows: stored status plus time and money (a hold runs out, a DP isn't settled, a booking ends). */
export type ShownStatus = "review" | "pending" | "dp" | "paid" | "done" | "cancelled" | "expired";

export type BookingType = "Retail" | "Event" | "Tribun" | "Ruangan";

export type Booking = {
  id: string;
  type?: BookingType; // missing = Retail (v1/v2 bookings)
  hours?: number; // length from `hour`; missing = 1 (v1/v2 bookings)
  tier?: Tier; // retail: perorangan tickets and day passes don't block the court
  pkg?: string; // event: Package id
  dates?: string[]; // event: every day rented; `date` is the first
  loadDates?: string[]; // event: persiapan & bongkar days (UI-07)
  loading?: number; // their cost
  doc?: string; // supporting letter file name (UI-10)
  special?: boolean; // asked for the instansi/federasi tariff (UI-10)
  review?: { rating: number; text: string; at: string }; // UI-11
  scheme?: Scheme;
  tax?: number;
  dueNow?: number; // charged at the first payment (DP or full)
  deposit?: number; // Uang Jaminan, paid separately
  paidAmount?: number;
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
  review: "Menunggu Verifikasi Admin",
  pending: "Menunggu pembayaran",
  dp: "DP dibayar",
  paid: "Lunas",
  done: "Selesai",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
};

/** Local start time of the booking (first day for events). */
export function slotStart(b: Pick<Booking, "date" | "hour">) {
  const [y, m, d] = b.date.split("-").map(Number);
  return new Date(y, m - 1, d, b.hour);
}

/** Local end time (last day for events). */
export function slotEnd(b: Pick<Booking, "date" | "hour" | "hours" | "dates">) {
  return new Date(slotStart({ date: b.dates?.at(-1) ?? b.date, hour: b.hour }).getTime() + (b.hours ?? 1) * 3_600_000);
}

export const bookingDates = (b: Pick<Booking, "date" | "dates">) => b.dates ?? [b.date];
export const isEvent = (b: Pick<Booking, "type">) => b.type === "Event" || b.type === "Tribun";
export const packageOf = (b: Booking): Package | undefined => getVenue(b.venueSlug)?.packages?.find((p) => p.id === b.pkg);

/** Still owed after a DP (0 when paid in full or not paid at all). */
export const balanceDue = (b: Booking) => (b.status === "paid" && b.scheme === "dp" ? Math.max(b.total - (b.paidAmount ?? b.total), 0) : 0);

/** UI-11 "Lunasi": the remaining balance plus the payment fee on it (same method as the DP). */
export function settleQuote(b: Booking) {
  const remaining = balanceDue(b);
  const fee = feeFor(b.method, remaining);
  return { remaining, fee, amount: remaining + fee };
}

export function shownStatus(b: Booking, now = new Date()): ShownStatus {
  const s = b.status ?? "paid";
  if (s === "pending" && b.holdExpiresAt && new Date(b.holdExpiresAt) <= now) return "expired";
  if (s === "paid" && slotEnd(b).getTime() <= now.getTime()) return "done";
  if (s === "paid" && balanceDue(b) > 0) return "dp";
  return s;
}

/** Holds the slot: under review, unpaid within the hold, (partly) paid, or already played. */
export const isActive = (b: Booking, now = new Date()) => ["review", "pending", "dp", "paid", "done"].includes(shownStatus(b, now));

/** PRD F6: cancel up to 2 hours before the start. */
export function canCancel(b: Booking, now = new Date()) {
  const s = shownStatus(b, now);
  return ["review", "pending", "dp", "paid"].includes(s) && slotStart(b).getTime() - now.getTime() >= CANCEL_HOURS * 3_600_000;
}

/** Every day an event booking occupies the venue: persiapan, event days, bongkar. */
export const occupiedDates = (b: Booking) => [...bookingDates(b), ...(b.loadDates ?? [])];

/** Whole venue is rented out that day (fake or real event/tribun booking, incl. loading days). */
export function isEventDay(slug: string, date: string, bookings: Booking[], now = new Date()) {
  return isEventDayTaken(slug, date) || bookings.some((b) => b.venueSlug === slug && isEvent(b) && occupiedDates(b).includes(date) && isActive(b, now));
}

/**
 * Retail block [hour, hour + hours) taken by: an event that day, the fake crowd (block start), or an
 * overlapping active booking. Perorangan tickets/day passes don't block (many people share the pool or wall).
 * ponytail: no per-unit capacity, a klub booking ignores individuals already holding tickets.
 */
export function isSlotTaken(slug: string, courtId: string, date: string, hour: number, bookings: Booking[], now = new Date(), hours = 1) {
  if (isEventDay(slug, date, bookings, now)) return true;
  const v = getVenue(slug);
  const crowd = v?.block !== "visit" && (!v?.packages?.length || isRetailBusyDay(slug, date));
  if (crowd && isBookedByOthers(slug, courtId, date, hour)) return true;
  return bookings.some((b) =>
    b.venueSlug === slug && b.courtId === courtId && b.date === date && !isEvent(b) && b.tier !== "perorangan" &&
    hour < b.hour + (b.hours ?? 1) && b.hour < hour + hours && isActive(b, now));
}

/**
 * UI-08: a room hour range is taken by the fake crowd (~25% per hour, or per day for whole-day rooms) or an overlapping
 * active booking of that room. ponytail: rooms don't clash with GOR events (separate mezzanine floor).
 */
export function isRoomTaken(slug: string, room: Room, date: string, hour: number, hours: number, bookings: Booking[], now = new Date()) {
  const fake = room.unit === "hari"
    ? dayHash(`${slug}|${room.id}|${date}`) < 25
    : Array.from({ length: hours }, (_, k) => hour + k).some((h) => dayHash(`${slug}|${room.id}|${date}|${h}`) < 25);
  return fake || bookings.some((b) =>
    b.venueSlug === slug && b.courtId === room.id && b.date === date &&
    hour < b.hour + (b.hours ?? 1) && b.hour < hour + hours && isActive(b, now));
}

/** UI-06: an event day is locked by another event, a busy retail day, or any active retail booking that day. */
export function isDayLocked(slug: string, date: string, bookings: Booking[], now = new Date()) {
  return isEventDay(slug, date, bookings, now) || isRetailBusyDay(slug, date) ||
    bookings.some((b) => b.venueSlug === slug && !isEvent(b) && b.date === date && isActive(b, now));
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
