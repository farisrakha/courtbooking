"use client";

// PRD F4: login gate → player data (prefilled) → payment method → voucher → "Bayar" creates a
// "Menunggu pembayaran" booking that holds the slot for HOLD_MINUTES, then shows payment instructions.
import Link from "next/link";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { use, useState } from "react";
import { browser } from "react-dom";
import { ArrowLeft, ChevronDown, CreditCard, Info, Landmark, MailWarning, QrCode, Ticket, User, Wallet } from "lucide-react";
import clsx from "clsx";
import { displayPhone, normalizePhone, phoneOk } from "@/lib/auth";
import {
  HOLD_MINUTES, PAYMENT_METHODS, findVoucher, formatDate, formatIDR, hourLabel, isSlotTaken, isoDate,
  quote, saveBooking, type Booking, type PaymentMethodId,
} from "@/lib/booking";
import { getVenue } from "@/lib/venues";
import { useBookings, useUser } from "@/lib/useStore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const ICONS = { qris: QrCode, ewallet: Wallet, bca: Landmark, mandiri: Landmark, card: CreditCard };
const enc = encodeURIComponent;
const field = "h-11 rounded-xl";

/** Validates the slot from the URL. Returns null if it can't be booked. */
function readSlot(p: URLSearchParams, bookings: Booking[]) {
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
  if (isSlotTaken(venue.slug, court.id, date, hour, bookings, now)) return null;
  return { venue, court, date, hour };
}

export function CheckoutForm() {
  use(browser("Checkout validates the slot against the clock and saved bookings."));
  const params = useSearchParams();
  const router = useRouter();
  const user = useUser();
  const bookings = useBookings();
  const [placing, setPlacing] = useState(false); // our own new hold makes the slot "taken"; don't flash the error
  const [method, setMethod] = useState<PaymentMethodId | "">("");
  const [code, setCode] = useState("");
  const [voucher, setVoucher] = useState("");
  const [voucherMsg, setVoucherMsg] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (placing) return <div className="h-[720px] animate-pulse rounded-2xl bg-muted" aria-label="Memproses" />;

  const slot = readSlot(params, bookings);
  if (!slot) {
    return (
      <Card className="mx-auto max-w-lg gap-0 rounded-2xl p-8 text-center ring-border">
        <p className="text-lg font-semibold text-primary">Slot ini tidak bisa dipesan</p>
        <p className="mt-2 text-sm text-muted-foreground">Mungkin baru saja dipesan orang lain, sudah lewat, atau tautannya tidak lengkap. Silakan pilih jadwal lagi.</p>
        <Link href={getVenue(params.get("venue") ?? "") ? `/venue/${params.get("venue")}` : "/#venue"} className={buttonVariants({ className: "mt-6" })}>Pilih jadwal lagi</Link>
      </Card>
    );
  }

  // Login gate (PRD F2): the slot rides along in `next`.
  const here = `/checkout?${params.toString()}`;
  if (!user) redirect(`/masuk?next=${enc(here)}`);
  if (!user.phone) redirect(`/daftar/whatsapp?next=${enc(here)}`);

  const { venue, court, date, hour } = slot;
  const cost = quote(court.price, method || "qris", voucher); // QRIS has no fee, so "no method yet" shows fee 0

  function applyVoucher() {
    const v = findVoucher(code);
    setVoucher(v ? code.trim().toUpperCase() : "");
    setVoucherMsg(v ? `Voucher dipakai. Kamu hemat ${formatIDR(quote(court.price, "qris", code).discount)}.` : "Kode voucher tidak valid.");
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const err: Record<string, string> = {};
    if (!f.name?.trim()) err.name = "Isi nama pemain.";
    if (!/^\S+@\S+\.\S+$/.test(f.email ?? "")) err.email = "Format email belum benar.";
    if (!phoneOk(f.phone ?? "")) err.phone = "Nomor WhatsApp belum benar, contoh 081234567890.";
    if (!method) err.method = "Pilih metode pembayaran.";
    setErrors(err);
    const first = Object.keys(err)[0];
    if (first) { document.getElementById(first === "method" ? "pm-qris" : first)?.focus(); return; }
    if (!user!.verified || !method) return;

    const now = new Date();
    const id = `INA-${now.getTime().toString(36).toUpperCase()}`;
    setPlacing(true);
    saveBooking({
      id, userEmail: user!.email, status: "pending",
      venueSlug: venue.slug, courtId: court.id, date, hour,
      name: f.name.trim(), email: f.email.trim(), phone: normalizePhone(f.phone), team: f.team?.trim() || undefined,
      method, voucher: voucher || undefined, ...quote(court.price, method, voucher),
      createdAt: now.toISOString(), holdExpiresAt: new Date(now.getTime() + HOLD_MINUTES * 60_000).toISOString(),
    });
    router.push(`/booking/${id}/bayar`);
  }

  const err = (k: string) => errors[k] && <p id={`${k}-error`} className="text-xs text-destructive">{errors[k]}</p>;
  const aria = (k: string) => (errors[k] ? { "aria-invalid": true, "aria-describedby": `${k}-error` } : {});

  return (
    <>
      <Link href={`/venue/${venue.slug}`} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Kembali ke jadwal
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-primary sm:text-3xl">Selesaikan booking</h1>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        <aside className="lg:sticky lg:top-24">
          <Card className="gap-0 rounded-2xl p-5 ring-border">
            <h2 className="text-sm font-semibold text-muted-foreground">Ringkasan booking</h2>
            <div className="mt-3 rounded-xl bg-secondary p-4">
              <p className="font-semibold text-primary">{venue.name}</p>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">Lokasi</dt><dd className="text-right">{venue.location}</dd>
                <dt className="text-muted-foreground">Lapangan</dt><dd className="text-right">{court.name} ({court.surface})</dd>
                <dt className="text-muted-foreground">Tanggal</dt><dd className="text-right">{formatDate(date)}</dd>
                <dt className="text-muted-foreground">Jam</dt><dd className="text-right tabular-nums">{hourLabel(hour)}–{hourLabel(hour + 1)}</dd>
                <dt className="text-muted-foreground">Durasi</dt><dd className="text-right">1 jam</dd>
              </dl>
              <p className="mt-3 flex justify-between border-t border-primary/10 pt-3 font-semibold">
                <span>Harga sewa</span><span className="text-primary tabular-nums">{formatIDR(court.price)}</span>
              </p>
            </div>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              <li>Slot ditahan {HOLD_MINUTES} menit setelah kamu menekan Bayar.</li>
              <li>Bukti booking dikirim ke email dan WhatsApp kamu.</li>
              <li>Pembatalan paling lambat 2 jam sebelum jadwal.</li>
              <li>Datang 15 menit lebih awal dan bawa kartu identitas.</li>
            </ul>
          </Card>
        </aside>

        <Card className="gap-0 rounded-2xl p-5 ring-border sm:p-6">
          <form onSubmit={submit} noValidate className="space-y-8">
            {!user.verified && (
              <Alert className="border-victory/30 bg-victory/5">
                <MailWarning aria-hidden />
                <AlertTitle>Verifikasi email dulu sebelum membayar</AlertTitle>
                <AlertDescription>
                  Cek email {user.email}. <Link href={`/verifikasi-email?next=${enc(here)}`} className="font-semibold text-primary underline">Buka verifikasi atau kirim ulang</Link>
                </AlertDescription>
              </Alert>
            )}

            <fieldset className="space-y-4">
              <legend className="mb-4 flex items-center gap-2 font-semibold text-primary"><User className="size-5" aria-hidden />Data pemain</legend>
              <p className="-mt-2 text-xs text-muted-foreground">Diisi dari profilmu. Perubahan di sini hanya untuk booking ini.</p>
              <div className="space-y-1.5"><Label htmlFor="name">Nama lengkap *</Label><Input id="name" name="name" autoComplete="name" defaultValue={user.name} className={field} {...aria("name")} />{err("name")}</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="email">Email *</Label><Input id="email" name="email" type="email" autoComplete="email" defaultValue={user.email} className={field} {...aria("email")} />{err("email")}</div>
                <div className="space-y-1.5"><Label htmlFor="phone">No. WhatsApp *</Label><Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={displayPhone(user.phone)} className={field} {...aria("phone")} />{err("phone")}</div>
              </div>
              <div className="space-y-1.5"><Label htmlFor="team">Nama tim <span className="font-normal text-muted-foreground">(opsional)</span></Label><Input id="team" name="team" defaultValue={user.team} className={field} placeholder="Kalau main bareng tim" /></div>
            </fieldset>

            <fieldset>
              <legend className="font-semibold text-primary">Metode pembayaran *</legend>
              <RadioGroup
                value={method}
                onValueChange={(v) => { setMethod(v as PaymentMethodId); setErrors((e) => ({ ...e, method: "" })); }}
                className="mt-3 gap-0 divide-y overflow-hidden rounded-xl border"
                aria-describedby={errors.method ? "method-error" : undefined}
              >
                {PAYMENT_METHODS.map((m) => {
                  const Icon = ICONS[m.id];
                  return (
                    <Label key={m.id} htmlFor={`pm-${m.id}`} className={clsx("flex cursor-pointer items-center gap-3 p-3 font-normal transition-colors", method === m.id ? "bg-secondary" : "hover:bg-muted")}>
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg border bg-background text-primary"><Icon className="size-5" aria-hidden /></span>
                      <span className="flex-1">
                        <span className="block text-sm font-medium">{m.label}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{m.note}</span>
                      </span>
                      <RadioGroupItem value={m.id} id={`pm-${m.id}`} />
                    </Label>
                  );
                })}
              </RadioGroup>
              <div className="mt-1.5">{err("method")}</div>
            </fieldset>

            <details className="group rounded-xl border" open={!!voucher}>
              <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
                <span className="grid size-10 place-items-center rounded-lg bg-victory/10 text-victory"><Ticket className="size-5" aria-hidden /></span>
                <span className="flex-1">
                  <span className="block text-sm font-medium">Pakai voucher</span>
                  <span className="block text-xs text-muted-foreground">{voucher ? `${voucher} terpasang` : "Punya kode promo?"}</span>
                </span>
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="border-t p-3">
                <div className="flex gap-2">
                  <Label htmlFor="voucher" className="sr-only">Kode voucher</Label>
                  <Input id="voucher" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyVoucher(); } }} className={clsx(field, "uppercase")} placeholder="KODE VOUCHER" />
                  <Button type="button" variant="outline" onClick={applyVoucher} className="h-11">Terapkan</Button>
                </div>
                <p className={clsx("mt-2 text-xs", voucherMsg && !voucher ? "text-destructive" : "text-ok")} aria-live="polite">
                  {voucherMsg || "Coba INASPORT10 untuk diskon 10%, maksimal Rp15.000."}
                </p>
              </div>
            </details>

            <section className="rounded-xl bg-muted p-4">
              <h2 className="font-semibold">Rincian biaya</h2>
              <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1.5 text-sm tabular-nums">
                <dt className="text-muted-foreground">Harga sewa</dt><dd>{formatIDR(cost.subtotal)}</dd>
                <dt className="text-muted-foreground">Biaya pembayaran</dt><dd>{method ? formatIDR(cost.fee) : "–"}</dd>
                {cost.discount > 0 && (<><dt className="text-ok">Diskon voucher</dt><dd className="text-ok">−{formatIDR(cost.discount)}</dd></>)}
                <dt className="mt-2 border-t pt-2 font-semibold">Total</dt>
                <dd className="mt-2 border-t pt-2 text-lg font-bold text-primary">{formatIDR(cost.total)}</dd>
              </dl>
            </section>

            <div>
              <Button type="submit" variant="cta" size="lg" className="w-full" disabled={!user.verified}>Bayar {formatIDR(cost.total)}</Button>
              <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                <Info className="mt-px size-3.5 shrink-0" aria-hidden />
                Mode demo: belum terhubung ke payment gateway, booking disimpan di browser ini.
              </p>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
