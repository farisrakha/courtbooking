// Pricing, slot availability, and saved bookings. No backend in v1.

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

export type Booking = {
  id: string;
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
};

const KEY = "ina-bookings";

// ponytail: bookings live in this browser's localStorage only. Move them to a database for real use.
export function loadBookings(): Booking[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveBooking(b: Booking) {
  localStorage.setItem(KEY, JSON.stringify([b, ...loadBookings()]));
}

export const slotKey = (slug: string, courtId: string, date: string, hour: number) =>
  `${slug}|${courtId}|${date}|${hour}`;
