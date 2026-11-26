"use client";

// PRD F4 (payment instructions), F5 (confirmation / detail) and F6 (Booking Saya).
import Link from "next/link";
import { redirect, useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useState } from "react";
import { browser } from "react-dom";
import {
  ArrowLeft, CalendarDays, CircleCheck, CircleX, Clock, Copy, CreditCard, Download, FileClock, FileText, Hourglass, MapPin,
  Star, User, Wallet,
} from "lucide-react";
import clsx from "clsx";
import {
  CANCEL_HOURS, DP_PCT, HOLD_MINUTES, PAYMENT_METHODS, STATUS_LABEL, TAX_PCT, balanceDue, bookingDates, canCancel,
  eventQuote, formatDate, formatIDR, hourLabel, isEvent, nextSameWeekday, occupiedDates, packageOf, settleQuote,
  shownStatus, slotStart, updateBooking, vaNumber, type PaymentMethodId,
  type Booking, type ShownStatus,
} from "@/lib/booking";
import { getVenue } from "@/lib/venues";
import { useBookings, useUser } from "@/lib/useStore";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const where = (b: Booking) => {
  const v = getVenue(b.venueSlug);
  const court = isEvent(b)
    ? packageOf(b)?.label ?? b.type!
    : v?.courts.find((c) => c.id === b.courtId)?.name ?? v?.rooms?.find((r) => r.id === b.courtId)?.name ?? b.courtId;
  return { venue: v?.name ?? b.venueSlug, court: b.tier === "klub" ? `${court} · Sewa Klub` : court };
};
const methodLabel = (b: Booking) => PAYMENT_METHODS.find((m) => m.id === b.method)?.label ?? b.method;
const short = (d: string) => formatDate(d, { weekday: "short", day: "numeric", month: "short" });
const hoursLabel = (b: Booking) => `${hourLabel(b.hour)}–${hourLabel((b.hour + (b.hours ?? 1)) % 24)}`;
const when = (b: Booking) => (isEvent(b) ? `${bookingDates(b).map(short).join(" · ")} (${b.hours} jam/hari)` : `${short(b.date)} · ${hoursLabel(b)}`);
/** First payment: DP or full. Older bookings have no dueNow and are paid in full. */
const firstPayment = (b: Booking) => b.dueNow ?? b.total;
const isDp = (b: Booking) => b.scheme === "dp";
/** Settle a DP before the venue is first used (persiapan day or first event day). */
const settleBy = (b: Booking) => formatDate([...occupiedDates(b)].sort()[0], { weekday: "short", day: "numeric", month: "short" });
const venueLink = (b: Booking, date: string) =>
  isEvent(b) ? `/venue/${b.venueSlug}?mode=event&pkg=${b.pkg}`
  : b.type === "Ruangan" ? `/venue/${b.venueSlug}?room=${b.courtId}`
  : `/venue/${b.venueSlug}?court=${b.courtId}&date=${date}${b.tier ? `&tier=${b.tier}` : ""}`;

export function TypeBadge({ b }: { b: Booking }) {
  return <Badge variant={isEvent(b) ? "default" : "outline"} className="h-6 px-2.5">{b.type ?? "Retail"}</Badge>;
}

/** Re-renders every second (countdowns, holds expiring, hours ending). */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/** The booking in the URL, only if it belongs to the logged-in user (PRD F5). */
function useOwnBooking() {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const user = useUser();
  const bookings = useBookings();
  if (!user) redirect(`/masuk?next=${encodeURIComponent(pathname)}`);
  return bookings.find((b) => b.id === id && b.userEmail === user.email);
}

const BADGE: Record<ShownStatus, string> = {
  review: "bg-secondary text-primary",
  pending: "bg-victory/10 text-victory",
  dp: "bg-secondary text-primary",
  paid: "bg-ok-soft text-ok",
  done: "bg-secondary text-secondary-foreground",
  cancelled: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
};

export function StatusBadge({ s }: { s: ShownStatus }) {
  return <Badge className={clsx("h-6 px-2.5", BADGE[s])}>{STATUS_LABEL[s]}</Badge>;
}

function NotFound() {
  return (
    <Card className="gap-0 rounded-2xl p-8 text-center ring-border">
      <p className="text-lg font-semibold text-primary">Booking tidak ditemukan</p>
      <p className="mt-2 text-sm text-muted-foreground">Booking ini tidak ada atau milik akun lain.</p>
      <Link href="/bookings" className={buttonVariants({ className: "mt-6" })}>Lihat Booking Saya</Link>
    </Card>
  );
}

function mmss(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// ponytail: decorative fake QR from the booking code; the payment provider returns the real QRIS image.
function qrBits(seed: string, n: number) {
  let h = 2166136261;
  return Array.from({ length: n * n }, (_, i) => {
    h = Math.imul(h ^ (seed.charCodeAt(i % seed.length) + i), 16777619);
    return (h >>> 0) % 2 === 0;
  });
}

function FakeQR({ seed }: { seed: string }) {
  const n = 21;
  const bits = qrBits(seed, n);
  const inFinder = (x: number, y: number) => (x < 7 || x >= n - 7) && (y < 7 || y >= n - 7) && !(x >= n - 7 && y >= n - 7);
  const finderOn = (x: number, y: number) => {
    const dx = x < 7 ? x : x - (n - 7), dy = y < 7 ? y : y - (n - 7);
    return dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
  };
  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} className="size-48 rounded-xl bg-white" role="img" aria-label="Kode QRIS (contoh demo)">
      {bits.map((on, i) => {
        const x = i % n, y = Math.floor(i / n);
        return (inFinder(x, y) ? finderOn(x, y) : on) ? <rect key={i} x={x} y={y} width={1} height={1} fill="#16163a" /> : null;
      })}
    </svg>
  );
}

function PayMethodBlock({ b }: { b: Booking }) {
  const [copied, setCopied] = useState(false);
  if (b.method === "qris") {
    return (
      <div className="grid place-items-center gap-3 text-center">
        <FakeQR seed={b.id} />
        <p className="text-sm text-muted-foreground">Scan dengan aplikasi bank atau e-wallet apa saja yang mendukung QRIS.</p>
      </div>
    );
  }
  if (b.method === "bca" || b.method === "mandiri") {
    const va = vaNumber(b);
    return (
      <div>
        <p className="text-sm text-muted-foreground">Nomor Virtual Account {b.method === "bca" ? "BCA" : "Mandiri"}</p>
        <div className="mt-1 flex items-center justify-between gap-3 rounded-xl bg-muted p-4">
          <span className="font-mono text-lg font-bold tracking-wider text-primary tabular-nums sm:text-xl">{va}</span>
          <Button variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(va).then(() => setCopied(true))}>
            <Copy aria-hidden />{copied ? "Tersalin" : "Salin"}
          </Button>
        </div>
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Buka {b.method === "bca" ? "BCA mobile / myBCA" : "Livin' by Mandiri"}.</li>
          <li>Pilih Transfer, lalu Virtual Account.</li>
          <li>Masukkan nomor di atas, cek nama &quot;INA SPORTS&quot; dan jumlahnya, lalu konfirmasi.</li>
        </ol>
      </div>
    );
  }
  if (b.method === "ewallet") {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-muted p-4 text-sm">
        <Wallet className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <p>Kamu akan diarahkan ke GoPay, DANA, atau OVO untuk menyetujui pembayaran. Setelah itu kembali ke halaman ini.</p>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-xl bg-muted p-4 text-sm">
      <CreditCard className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      <p>Formulir kartu dari penyedia pembayaran muncul di sini. Data kartu tidak pernah disimpan oleh INA Sports.</p>
    </div>
  );
}

// ---------------- Instruksi bayar (DP, lunas, or pelunasan) ----------------

export function PayInstructions() {
  use(browser("Bookings are stored in localStorage."));
  const b = useOwnBooking();
  const now = useNow();
  const lunasi = useSearchParams().has("lunasi");
  if (!b) return <NotFound />;
  const s = shownStatus(b, now);
  // Settlement only through the "Lunasi" link; after the DP is paid, go to the booking.
  if (s !== "pending" && s !== "expired" && !(s === "dp" && lunasi)) redirect(`/booking/${b.id}`);
  const { venue, court } = where(b);

  if (s === "expired") {
    return (
      <Card className="gap-0 rounded-2xl p-8 text-center ring-border">
        <Hourglass className="mx-auto size-12 text-muted-foreground" aria-hidden />
        <h1 className="mt-4 text-xl font-bold text-primary">Waktu pembayaran habis</h1>
        <p className="mt-2 text-sm text-muted-foreground">{isEvent(b) ? "Tanggal acara" : "Slot"} sudah dibuka lagi. Tidak ada uang yang ditarik.</p>
        <Link href={venueLink(b, b.date)} className={buttonVariants({ variant: "cta", size: "lg", className: "mt-6" })}>Pilih jadwal lagi</Link>
      </Card>
    );
  }

  // UI-11 "Lunasi": the DP is paid, settle the rest (no hold, the dates are already ours).
  const settle = s === "dp";
  const sq = settleQuote(b);
  const amount = settle ? sq.amount : firstPayment(b);
  const fee = settle ? sq.fee : b.fee;
  const label = settle ? "Pelunasan" : isDp(b) ? `Uang muka (DP ${DP_PCT}%)` : "Total";
  const pay = () =>
    updateBooking(b.id, settle
      ? { total: b.total + sq.fee, fee: b.fee + sq.fee, paidAmount: b.total + sq.fee, paidAt: new Date().toISOString() }
      : { status: "paid", paidAt: new Date().toISOString(), paidAmount: firstPayment(b) });
  const left = new Date(b.holdExpiresAt ?? 0).getTime() - now.getTime();
  // A special-tariff request skipped the method at checkout; pick it now and re-price the fee.
  const pkg = packageOf(b);
  const choose = b.special && !settle && pkg;
  const setMethod = (m: PaymentMethodId) => {
    const q = eventQuote(pkg!.price, bookingDates(b).length, b.scheme ?? "lunas", m, b.loadDates?.length ?? 0);
    updateBooking(b.id, { method: m, fee: q.fee, total: q.total, dueNow: q.dueNow });
  };

  return (
    <Card className="gap-0 overflow-hidden rounded-2xl py-0 ring-border">
      <header className="bg-integrity-deep px-6 py-6 text-center text-white">
        {settle ? (
          <>
            <h1 className="text-sm font-normal text-white/80">Pelunasan booking</h1>
            <p className="mt-1 text-2xl font-bold">{b.id}</p>
            <p className="mt-1 text-xs text-white/70">Lunasi paling lambat {settleBy(b)}.</p>
          </>
        ) : (
          <>
            <h1 className="text-sm font-normal text-white/80">Selesaikan pembayaran dalam</h1>
            <p className="mt-1 font-mono text-4xl font-bold tabular-nums" role="timer" aria-live="off">{mmss(left)}</p>
            <p className="mt-1 text-xs text-white/70">{isEvent(b) ? "Tanggal acara" : "Slot"} ditahan {HOLD_MINUTES} menit untukmu.</p>
          </>
        )}
      </header>
      <div className="space-y-6 p-6">
        <div className="flex items-end justify-between gap-4 border-b pb-4">
          <div>
            <p className="text-xs text-muted-foreground">{label} · {methodLabel(b)}</p>
            <p className="text-2xl font-bold text-primary tabular-nums">{formatIDR(amount)}</p>
            {fee > 0 && <p className="text-xs text-muted-foreground tabular-nums">{formatIDR(amount - fee)} + biaya {formatIDR(fee)}</p>}
          </div>
          <p className="text-right text-xs text-muted-foreground">{venue}<br />{court} · {when(b)}</p>
        </div>
        {choose && (
          <label className="block text-sm">
            <span className="font-medium">Metode pembayaran</span>
            <select
              value={b.method}
              onChange={(e) => setMethod(e.target.value as PaymentMethodId)}
              className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {PAYMENT_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label} ({m.note})</option>)}
            </select>
          </label>
        )}
        <PayMethodBlock b={b} />
        <div className="grid gap-3">
          <Button variant="cta" size="lg" onClick={pay}>Saya sudah bayar (demo)</Button>
          {settle ? (
            <Link href={`/booking/${b.id}`} className={buttonVariants({ variant: "ghost" })}>Nanti saja</Link>
          ) : (
            <Button variant="ghost" onClick={() => updateBooking(b.id, { status: "cancelled", cancelledAt: new Date().toISOString() })}>
              Batalkan pesanan
            </Button>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground">Mode demo: tombol di atas menggantikan konfirmasi otomatis dari penyedia pembayaran.</p>
      </div>
    </Card>
  );
}

// ---------------- Detail / Booking berhasil ----------------

type Head = { icon: typeof CircleCheck; title: string; sub: string; tone: string };
function head(b: Booking, s: ShownStatus, now: Date): Head {
  const event = isEvent(b);
  switch (s) {
    case "review": return { icon: FileClock, title: "Menunggu verifikasi admin", sub: "Admin LPUK memeriksa suratmu dan menghubungi lewat WhatsApp. Kamu bayar setelah disetujui.", tone: "bg-secondary text-primary" };
    case "pending": return { icon: Clock, title: "Menunggu pembayaran", sub: `Selesaikan dalam ${mmss(new Date(b.holdExpiresAt!).getTime() - now.getTime())}`, tone: "bg-secondary text-primary" };
    case "dp": return { icon: CircleCheck, title: "DP diterima", sub: `Tanggal acaramu aman. Lunasi ${formatIDR(balanceDue(b))} paling lambat ${settleBy(b)}.`, tone: "bg-secondary text-primary" };
    case "paid": return { icon: CircleCheck, title: "Booking berhasil!", sub: event ? "Acaramu sudah dipesan." : "Lapanganmu sudah dipesan.", tone: "bg-ok-soft text-ok" };
    case "done": return { icon: CircleCheck, title: "Selesai", sub: event ? "Semoga acaranya lancar!" : "Semoga seru mainnya!", tone: "bg-secondary text-primary" };
    case "cancelled": return { icon: CircleX, title: "Booking dibatalkan", sub: `${event ? "Tanggal" : "Slot"} sudah dibuka lagi.`, tone: "bg-muted text-muted-foreground" };
    case "expired": return { icon: Hourglass, title: "Kedaluwarsa", sub: "Pembayaran tidak selesai tepat waktu.", tone: "bg-muted text-muted-foreground" };
  }
}

/** UI-11 "Beri Ulasan": kept on the booking. ponytail: not shown publicly until there's a backend (no fake ratings). */
function ReviewBox({ b }: { b: Booking }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  if (b.review) {
    return (
      <section className="rounded-xl border p-4">
        <h2 className="font-semibold">Ulasanmu</h2>
        <p className="mt-1 flex gap-0.5 text-primary" aria-label={`${b.review.rating} dari 5`}>
          {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={clsx("size-4", n <= b.review!.rating && "fill-current")} aria-hidden />)}
        </p>
        {b.review.text && <p className="mt-2 text-sm text-muted-foreground">{b.review.text}</p>}
      </section>
    );
  }
  return (
    <form
      id="ulasan"
      className="scroll-mt-24 rounded-xl border p-4 print:hidden"
      onSubmit={(e) => { e.preventDefault(); if (rating) updateBooking(b.id, { review: { rating, text: text.trim(), at: new Date().toISOString() } }); }}
    >
      <h2 className="font-semibold">Beri ulasan</h2>
      <p className="text-xs text-muted-foreground">Bagaimana pengalamanmu di {where(b).venue}?</p>
      <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Nilai">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} bintang`} onClick={() => setRating(n)} className="rounded p-1 text-primary hover:bg-secondary">
            <Star className={clsx("size-6", n <= rating && "fill-current")} aria-hidden />
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={500}
        aria-label="Ulasan"
        placeholder="Ceritakan kondisi lapangan, fasilitas, atau pelayanan (opsional)"
        className="mt-2 w-full rounded-xl border border-input bg-card p-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <Button type="submit" variant="outline" className="mt-2" disabled={!rating}>Kirim ulasan</Button>
    </form>
  );
}

export function BookingDetail() {
  use(browser("Bookings are stored in localStorage."));
  const b = useOwnBooking();
  const now = useNow();
  const router = useRouter();
  // History-card links (#ulasan, #batal) land here before the browser-only content exists; scroll once it does.
  const found = !!b;
  useEffect(() => {
    if (found && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: "center" });
  }, [found]);
  if (!b) return <NotFound />;
  const s = shownStatus(b, now);
  const { venue, court } = where(b);
  const h = head(b, s, now);
  const event = isEvent(b);
  const visit = getVenue(b.venueSlug)?.block === "visit";
  const rebook = venueLink(b, nextSameWeekday(b.date, now));
  const cancellable = canCancel(b, now);
  const cancel = () => updateBooking(b.id, { status: "cancelled", cancelledAt: new Date().toISOString() });
  const approve = () => {
    updateBooking(b.id, { status: "pending", holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString() });
    router.push(`/booking/${b.id}/bayar`);
  };
  const paidSoFar = b.paidAmount ?? (s === "paid" || s === "done" ? b.total : 0);
  const due = balanceDue(b);

  return (
    <>
      <Link href="/bookings" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline print:hidden">
        <ArrowLeft className="size-4" aria-hidden /> Booking Saya
      </Link>
      <Card className="gap-0 overflow-hidden rounded-2xl py-0 ring-border">
        <header className={clsx("px-6 py-8 text-center", h.tone)}>
          <h.icon className="mx-auto size-14" aria-hidden />
          <h1 className="mt-3 text-2xl font-bold text-primary">{h.title}</h1>
          <p className="mx-auto mt-1 max-w-sm text-sm">{h.sub}</p>
        </header>
        <div className="space-y-6 p-6">
          <div className="rounded-xl bg-muted p-4 text-center">
            <p className="text-xs text-muted-foreground">Kode booking</p>
            <p className="mt-1 font-mono text-xl font-bold tracking-wider text-primary">{b.id}</p>
            <div className="mt-2 flex justify-center gap-1.5"><TypeBadge b={b} /><StatusBadge s={s} /></div>
          </div>

          <section>
            <h2 className="font-semibold">Detail booking</h2>
            <ul className="mt-3 space-y-3 text-sm">
              <li className="flex gap-3"><MapPin className="size-5 shrink-0 text-primary" aria-hidden /><span><b className="block font-medium">{venue}</b><span className="text-muted-foreground">{court}</span></span></li>
              <li className="flex gap-3">
                <CalendarDays className="size-5 shrink-0 text-primary" aria-hidden />
                <span>
                  {bookingDates(b).map((d) => <span key={d} className="block">{formatDate(d)}</span>)}
                  {b.loadDates?.length ? <span className="mt-1 block text-muted-foreground">Persiapan & bongkar: {b.loadDates.map(short).join(", ")}</span> : null}
                </span>
              </li>
              <li className="flex gap-3">
                <Clock className="size-5 shrink-0 text-primary" aria-hidden />
                <span>
                  <b className="block font-medium tabular-nums">{hoursLabel(b)}</b>
                  <span className="text-muted-foreground">{event ? `${bookingDates(b).length} hari × ${b.hours} jam` : visit ? "1 kedatangan" : `Durasi ${b.hours ?? 1} jam`}</span>
                </span>
              </li>
              <li className="flex gap-3"><User className="size-5 shrink-0 text-primary" aria-hidden /><span className="min-w-0"><b className="block font-medium">{b.name}{b.team ? ` · ${b.team}` : ""}</b><span className="break-all text-muted-foreground">{b.email} · {b.phone}</span></span></li>
              {b.doc && <li className="flex gap-3"><FileText className="size-5 shrink-0 text-primary" aria-hidden /><span><b className="block font-medium">{b.doc}</b><span className="text-muted-foreground">{b.special ? "Pengajuan tarif khusus instansi / federasi" : "Dokumen pendukung"}</span></span></li>}
            </ul>
          </section>

          <section className="border-t pt-5">
            <h2 className="font-semibold">Pembayaran</h2>
            <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1.5 text-sm tabular-nums">
              <dt className="text-muted-foreground">Harga sewa</dt><dd>{formatIDR(b.subtotal)}</dd>
              {!!b.loading && (<><dt className="text-muted-foreground">Persiapan & bongkar</dt><dd>{formatIDR(b.loading)}</dd></>)}
              {b.tax != null && (<><dt className="text-muted-foreground">Pajak ({TAX_PCT}%)</dt><dd>{formatIDR(b.tax)}</dd></>)}
              <dt className="text-muted-foreground">Biaya pembayaran ({methodLabel(b)})</dt><dd>{formatIDR(b.fee)}</dd>
              {b.discount > 0 && (<><dt className="text-ok">Diskon {b.voucher}</dt><dd className="text-ok">−{formatIDR(b.discount)}</dd></>)}
              <dt className="mt-2 border-t pt-2 font-semibold">{s === "paid" || s === "done" ? "Total dibayar" : "Total"}</dt>
              <dd className="mt-2 border-t pt-2 text-lg font-bold text-primary">{formatIDR(b.total)}</dd>
              {isDp(b) && paidSoFar > 0 && due > 0 && (<>
                <dt className="text-muted-foreground">DP {DP_PCT}% dibayar{b.fee ? ` (termasuk biaya ${formatIDR(b.fee)})` : ""}</dt><dd>{formatIDR(paidSoFar)}</dd>
                <dt className="font-semibold text-primary">Sisa pelunasan</dt><dd className="font-semibold text-primary">{formatIDR(due)}</dd>
              </>)}
              {isDp(b) && !paidSoFar && (<><dt className="text-muted-foreground">Dibayar dulu (DP {DP_PCT}%)</dt><dd>{formatIDR(firstPayment(b))}</dd></>)}
              {b.deposit != null && (<><dt className="text-muted-foreground">Uang Jaminan (terpisah)</dt><dd>{formatIDR(b.deposit)}</dd></>)}
              {event && <dd className="col-span-2 mt-1 text-xs text-muted-foreground">Belum termasuk listrik, air, dan service charge.</dd>}
            </dl>
          </section>

          {(s === "paid" || s === "dp") && (
            <section className="rounded-xl bg-secondary p-4 text-sm">
              <h2 className="font-semibold text-primary">Penting</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-secondary-foreground/80">
                {event ? (
                  <>
                    {s === "dp" && <li>Lunasi sisa pembayaran paling lambat {settleBy(b)}.</li>}
                    <li>Uang Jaminan dan biaya listrik, air, serta service charge diatur bersama admin venue.</li>
                    <li>Pembatalan dan pengembalian dana mengikuti ketentuan LPUK.</li>
                  </>
                ) : (
                  <>
                    <li>Datang 15 menit sebelum jadwal.</li>
                    <li>Tunjukkan kode booking dan kartu identitas di meja venue.</li>
                    <li>Pembatalan paling lambat {CANCEL_HOURS} jam sebelum jadwal.</li>
                  </>
                )}
              </ul>
            </section>
          )}

          {s === "done" && <ReviewBox b={b} />}

          <div className="grid gap-3 sm:grid-cols-2 print:hidden">
            {s === "review" && (
              <Button variant="outline" size="lg" className="sm:col-span-2" onClick={approve}>Setujui pengajuan (demo admin)</Button>
            )}
            {s === "pending" && (
              <Link href={`/booking/${b.id}/bayar`} className={buttonVariants({ variant: "cta", size: "lg", className: "sm:col-span-2" })}>Lanjutkan bayar</Link>
            )}
            {s === "dp" && (
              <Link href={`/booking/${b.id}/bayar?lunasi=1`} className={buttonVariants({ variant: "cta", size: "lg", className: "sm:col-span-2" })}>Lunasi {formatIDR(balanceDue(b))}</Link>
            )}
            {(s === "paid" || s === "done" || s === "dp") && (
              <Button variant="outline" size="lg" onClick={() => window.print()}><Download aria-hidden />Unduh bukti</Button>
            )}
            {(s === "done" || s === "cancelled" || s === "expired") && (
              <Link href={rebook} className={buttonVariants({ variant: s === "done" ? "outline" : "cta", size: "lg", className: s === "done" ? "" : "sm:col-span-2" })}>Pesan lagi</Link>
            )}
            {cancellable && (
              <span id="batal" className="sr-only scroll-mt-24">Pembatalan</span>
            )}
            {cancellable && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="text-destructive hover:bg-destructive/5 hover:text-destructive sm:col-span-2">{event ? "Ajukan pembatalan" : "Batalkan booking"}</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{event ? "Ajukan pembatalan acara ini?" : "Batalkan booking ini?"}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {court}, {when(b)} akan dibuka lagi. Pengembalian dana mengikuti kebijakan INA Sports.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Tidak jadi</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={cancel}>Ya, batalkan</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          {s === "paid" && !cancellable && (
            <p className="text-center text-xs text-muted-foreground print:hidden">Pembatalan sudah ditutup (kurang dari {CANCEL_HOURS} jam sebelum mulai).</p>
          )}
        </div>
      </Card>
    </>
  );
}

// ---------------- Booking Saya ----------------

export function BookingList() {
  use(browser("Bookings are stored in localStorage."));
  const user = useUser();
  const all = useBookings();
  const router = useRouter();
  const now = useNow();
  if (!user) redirect("/masuk?next=%2Fbookings");

  const mine = all.filter((b) => b.userEmail === user.email).map((b) => ({ b, s: shownStatus(b, now) }));
  const start = (b: Booking) => slotStart(b).getTime();
  const tabs = [
    { id: "upcoming", label: "Akan datang", list: mine.filter((x) => ["review", "pending", "dp", "paid"].includes(x.s)).sort((x, y) => start(x.b) - start(y.b)), empty: "Belum ada booking yang akan datang." },
    { id: "done", label: "Selesai", list: mine.filter((x) => x.s === "done").sort((x, y) => start(y.b) - start(x.b)), empty: "Belum ada booking yang selesai." },
    { id: "cancelled", label: "Dibatalkan", list: mine.filter((x) => x.s === "cancelled" || x.s === "expired").sort((x, y) => y.b.createdAt.localeCompare(x.b.createdAt)), empty: "Tidak ada booking yang dibatalkan." },
  ];

  if (!mine.length) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center">
        <p className="font-medium">Belum ada booking.</p>
        <p className="mt-1 text-sm text-muted-foreground">Pilih lapangan dan jam yang kosong, booking kamu akan muncul di sini.</p>
        <Link href="/#venue" className={buttonVariants({ variant: "cta", className: "mt-6" })}>Cari lapangan</Link>
      </div>
    );
  }

  return (
    <Tabs defaultValue="upcoming">
      <TabsList className="h-11 w-full sm:w-fit">
        {tabs.map((t) => (
          <TabsTrigger key={t.id} value={t.id} className="px-3">
            {t.label} <span className="text-xs text-muted-foreground tabular-nums">{t.list.length}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.id} value={t.id} className="mt-3">
          {t.list.length ? (
            <ul className="space-y-3">
              {t.list.map(({ b, s }) => {
                const { venue, court } = where(b);
                return (
                  <li key={b.id}>
                    <Link href={`/booking/${b.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-primary">
                      <span className="min-w-0">
                        <span className="block font-semibold text-primary">{venue}</span>
                        <span className="block text-sm text-muted-foreground">{court} · <span className="tabular-nums">{when(b)}</span>{b.loadDates?.length ? ` + ${b.loadDates.length} hari persiapan/bongkar` : ""}</span>
                        <span className="mt-2 flex gap-1.5"><TypeBadge b={b} /><StatusBadge s={s} /></span>
                      </span>
                      <span className="text-right">
                        <span className="block font-mono text-xs text-muted-foreground">{b.id}</span>
                        <span className="block font-semibold tabular-nums">{formatIDR(b.total)}</span>
                        {s === "dp" && <span className="block text-xs font-medium text-primary">Sisa {formatIDR(balanceDue(b))}</span>}
                      </span>
                    </Link>
                    {/* UI-11: the card's own actions. */}
                    {(s === "dp" || (s === "done" && !b.review) || canCancel(b, now)) && (
                      <span className="mt-2 flex flex-wrap gap-2">
                        {s === "dp" && (
                          <Link href={`/booking/${b.id}/bayar?lunasi=1`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                            Lunasi {formatIDR(balanceDue(b))} · paling lambat {settleBy(b)}
                          </Link>
                        )}
                        {s === "done" && !b.review && (
                          <Link href={`/booking/${b.id}#ulasan`} className={buttonVariants({ variant: "outline", size: "sm" })}>Beri ulasan</Link>
                        )}
                        {canCancel(b, now) && (
                          <Link href={`/booking/${b.id}#batal`} className={buttonVariants({ variant: "ghost", size: "sm", className: "text-destructive hover:text-destructive" })}>
                            Ajukan pembatalan
                          </Link>
                        )}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              {t.empty}
              {t.id === "upcoming" && (
                <div><Button className="mt-4" onClick={() => router.push("/#venue")}>Cari lapangan</Button></div>
              )}
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
