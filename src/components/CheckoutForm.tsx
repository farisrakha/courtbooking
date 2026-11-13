"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useState } from "react";
import { browser } from "react-dom";
import { ArrowLeft, ChevronDown, CreditCard, Info, Landmark, QrCode, Ticket, User, Wallet } from "lucide-react";
import clsx from "clsx";
import {
  PAYMENT_METHODS, findVoucher, formatDate, formatIDR, hourLabel, isBookedByOthers, isoDate,
  loadBookings, quote, saveBooking, slotKey, type PaymentMethodId,
} from "@/lib/booking";
import { getVenue } from "@/lib/venues";
import { btn, card, input, label } from "./ui";

const ICONS = { qris: QrCode, ewallet: Wallet, bca: Landmark, mandiri: Landmark, card: CreditCard };

/** Validates the slot from the URL. Returns null if it can't be booked. */
function useSlot() {
  const p = useSearchParams();
  const venue = getVenue(p.get("venue") ?? "");
  const court = venue?.courts.find((c) => c.id === p.get("court"));
  const date = p.get("date") ?? "";
  const hour = Number(p.get("hour"));
  if (!venue || venue.comingSoon || !court || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(hour)) return null;

  const now = new Date();
  const today = isoDate(now);
  const lastDay = isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6));
  if (date < today || date > lastDay || hour < venue.open || hour >= venue.close) return null;
  if (date === today && hour <= now.getHours()) return null;
  const key = slotKey(venue.slug, court.id, date, hour);
  if (isBookedByOthers(venue.slug, court.id, date, hour) || loadBookings().some((b) => slotKey(b.venueSlug, b.courtId, b.date, b.hour) === key)) return null;
  return { venue, court, date, hour };
}

export function CheckoutForm() {
  use(browser("Checkout validates the slot against the clock and saved bookings."));
  const router = useRouter();
  const slot = useSlot();
  const [method, setMethod] = useState<PaymentMethodId | "">("");
  const [code, setCode] = useState("");
  const [voucher, setVoucher] = useState("");
  const [voucherMsg, setVoucherMsg] = useState("");

  if (!slot) {
    return (
      <div className={`${card} mx-auto max-w-lg p-8 text-center`}>
        <p className="text-lg font-semibold text-integrity">Slot ini tidak bisa dipesan</p>
        <p className="mt-2 text-sm text-muted">Mungkin sudah penuh, sudah lewat, atau tautannya tidak lengkap. Silakan pilih jadwal lagi.</p>
        <Link href="/#venue" className={clsx(btn("navy"), "mt-6")}>Pilih venue</Link>
      </div>
    );
  }

  const { venue, court, date, hour } = slot;
  const cost = quote(court.price, method || "qris", voucher); // QRIS has no fee, so "no method yet" shows fee 0

  function applyVoucher() {
    const v = findVoucher(code);
    setVoucher(v ? code.trim().toUpperCase() : "");
    setVoucherMsg(v ? `Voucher dipakai. Kamu hemat ${formatIDR(quote(court.price, "qris", code).discount)}.` : "Kode voucher tidak valid.");
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!method) return;
    const f = new FormData(e.currentTarget);
    const id = `INA-${Date.now().toString(36).toUpperCase()}`;
    const q = quote(court.price, method, voucher);
    saveBooking({
      id, venueSlug: venue.slug, courtId: court.id, date, hour,
      name: String(f.get("name")).trim(), email: String(f.get("email")).trim(), phone: String(f.get("phone")).trim(),
      team: String(f.get("team") ?? "").trim() || undefined,
      method, voucher: voucher || undefined, ...q, createdAt: new Date().toISOString(),
    });
    router.push(`/booking/${id}`);
  }

  return (
    <>
      <Link href={`/venue/${venue.slug}`} className="inline-flex items-center gap-2 text-sm font-medium text-integrity hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Kembali ke jadwal
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-integrity sm:text-3xl">Selesaikan booking</h1>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className={`${card} p-5`}>
            <h2 className="text-sm font-semibold text-muted">Ringkasan booking</h2>
            <div className="mt-3 rounded-xl bg-integrity-soft p-4">
              <p className="font-semibold text-integrity">{venue.name}</p>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-muted">Lokasi</dt><dd className="text-right">{venue.location}</dd>
                <dt className="text-muted">Lapangan</dt><dd className="text-right">{court.name} ({court.surface})</dd>
                <dt className="text-muted">Tanggal</dt><dd className="text-right">{formatDate(date)}</dd>
                <dt className="text-muted">Jam</dt><dd className="text-right tabular-nums">{hourLabel(hour)}–{hourLabel(hour + 1)}</dd>
                <dt className="text-muted">Durasi</dt><dd className="text-right">1 jam</dd>
              </dl>
              <p className="mt-3 flex justify-between border-t border-integrity/10 pt-3 font-semibold">
                <span>Harga sewa</span><span className="text-integrity tabular-nums">{formatIDR(court.price)}</span>
              </p>
            </div>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-muted">
              <li>Bukti booking dikirim ke email kamu.</li>
              <li>Pembatalan paling lambat 2 jam sebelum jadwal.</li>
              <li>Datang 15 menit lebih awal dan bawa kartu identitas.</li>
            </ul>
          </div>
        </aside>

        <form onSubmit={submit} className={`${card} space-y-8 p-5 sm:p-6`}>
          <fieldset className="space-y-4">
            <legend className="mb-4 flex items-center gap-2 font-semibold text-integrity"><User className="size-5" aria-hidden />Data pemain</legend>
            <div><label htmlFor="name" className={label}>Nama lengkap *</label><input id="name" name="name" required autoComplete="name" className={input} placeholder="Nama sesuai KTP" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="email" className={label}>Email *</label><input id="email" name="email" type="email" required autoComplete="email" className={input} placeholder="nama@email.com" /></div>
              <div>
                <label htmlFor="phone" className={label}>No. WhatsApp *</label>
                <input id="phone" name="phone" type="tel" required autoComplete="tel" inputMode="tel" pattern="(\+62|62|0)8[0-9]{7,12}" title="Contoh: 081234567890" className={input} placeholder="08xxxxxxxxxx" />
              </div>
            </div>
            <div><label htmlFor="team" className={label}>Nama tim <span className="font-normal text-muted">(opsional)</span></label><input id="team" name="team" className={input} placeholder="Kalau main bareng tim" /></div>
          </fieldset>

          <fieldset>
            <legend className="font-semibold text-integrity">Metode pembayaran *</legend>
            <div className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line">
              {PAYMENT_METHODS.map((m) => {
                const Icon = ICONS[m.id];
                return (
                  <label key={m.id} className={clsx("flex cursor-pointer items-center gap-3 p-3 transition-colors", method === m.id ? "bg-integrity-soft" : "hover:bg-platinum")}>
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-white text-integrity"><Icon className="size-5" aria-hidden /></span>
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{m.label}</span>
                      <span className="block text-xs text-muted">{m.note}</span>
                    </span>
                    <input type="radio" name="method" value={m.id} required checked={method === m.id} onChange={() => setMethod(m.id)} className="size-4 accent-integrity" />
                  </label>
                );
              })}
            </div>
          </fieldset>

          <details className="group rounded-xl border border-line" open={!!voucher}>
            <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
              <span className="grid size-10 place-items-center rounded-lg bg-victory/10 text-victory"><Ticket className="size-5" aria-hidden /></span>
              <span className="flex-1">
                <span className="block text-sm font-medium">Pakai voucher</span>
                <span className="block text-xs text-muted">{voucher ? `${voucher} terpasang` : "Punya kode promo?"}</span>
              </span>
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="border-t border-line p-3">
              <div className="flex gap-2">
                <label htmlFor="voucher" className="sr-only">Kode voucher</label>
                <input id="voucher" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyVoucher(); } }} className={clsx(input, "uppercase")} placeholder="KODE VOUCHER" />
                <button type="button" onClick={applyVoucher} className={btn("outline")}>Terapkan</button>
              </div>
              <p className={clsx("mt-2 text-xs", voucherMsg && !voucher ? "text-victory" : "text-ok")} aria-live="polite">
                {voucherMsg || "Coba INASPORT10 untuk diskon 10%, maksimal Rp15.000."}
              </p>
            </div>
          </details>

          <section className="rounded-xl bg-platinum p-4">
            <h2 className="font-semibold">Rincian biaya</h2>
            <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1.5 text-sm tabular-nums">
              <dt className="text-muted">Harga sewa</dt><dd>{formatIDR(cost.subtotal)}</dd>
              <dt className="text-muted">Biaya pembayaran</dt><dd>{method ? formatIDR(cost.fee) : "–"}</dd>
              {cost.discount > 0 && (<><dt className="text-ok">Diskon voucher</dt><dd className="text-ok">−{formatIDR(cost.discount)}</dd></>)}
              <dt className="mt-2 border-t border-line pt-2 font-semibold">Total</dt>
              <dd className="mt-2 border-t border-line pt-2 text-lg font-bold text-integrity">{formatIDR(cost.total)}</dd>
            </dl>
          </section>

          <div>
            <button type="submit" className={clsx(btn("primary", "lg"), "w-full")}>Bayar {formatIDR(cost.total)}</button>
            <p className="mt-2 flex items-start gap-1.5 text-xs text-muted">
              <Info className="mt-px size-3.5 shrink-0" aria-hidden />
              Mode demo: belum terhubung ke payment gateway, booking disimpan di browser ini.
            </p>
          </div>
        </form>
      </div>
    </>
  );
}
