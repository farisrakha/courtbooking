"use client";

// PRD F4 (payment instructions), F5 (confirmation / detail) and F6 (Booking Saya).
import Link from "next/link";
import { redirect, useParams, usePathname, useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { browser } from "react-dom";
import {
  ArrowLeft, CalendarDays, CircleCheck, CircleX, Clock, Copy, CreditCard, Download, Hourglass, MapPin, User, Wallet,
} from "lucide-react";
import clsx from "clsx";
import {
  CANCEL_HOURS, HOLD_MINUTES, PAYMENT_METHODS, STATUS_LABEL, canCancel, formatDate, formatIDR, hourLabel,
  nextSameWeekday, shownStatus, slotStart, updateBooking, vaNumber, type Booking, type ShownStatus,
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
  return { venue: v?.name ?? b.venueSlug, court: v?.courts.find((c) => c.id === b.courtId)?.name ?? b.courtId };
};
const methodLabel = (b: Booking) => PAYMENT_METHODS.find((m) => m.id === b.method)?.label ?? b.method;
const when = (b: Booking) => `${formatDate(b.date, { weekday: "short", day: "numeric", month: "short" })} · ${hourLabel(b.hour)}–${hourLabel(b.hour + 1)}`;

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
  pending: "bg-victory/10 text-victory",
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

// ---------------- Instruksi bayar ----------------

export function PayInstructions() {
  use(browser("Bookings are stored in localStorage."));
  const b = useOwnBooking();
  const now = useNow();
  if (!b) return <NotFound />;
  const s = shownStatus(b, now);
  if (s !== "pending" && s !== "expired") redirect(`/booking/${b.id}`);
  const { venue, court } = where(b);

  if (s === "expired") {
    return (
      <Card className="gap-0 rounded-2xl p-8 text-center ring-border">
        <Hourglass className="mx-auto size-12 text-muted-foreground" aria-hidden />
        <h1 className="mt-4 text-xl font-bold text-primary">Waktu pembayaran habis</h1>
        <p className="mt-2 text-sm text-muted-foreground">Slot sudah dibuka lagi untuk pemain lain. Tidak ada uang yang ditarik.</p>
        <Link href={`/venue/${b.venueSlug}?court=${b.courtId}&date=${b.date}`} className={buttonVariants({ variant: "cta", size: "lg", className: "mt-6" })}>Pilih jadwal lagi</Link>
      </Card>
    );
  }

  const left = new Date(b.holdExpiresAt!).getTime() - now.getTime();
  return (
    <Card className="gap-0 overflow-hidden rounded-2xl py-0 ring-border">
      <header className="bg-integrity-deep px-6 py-6 text-center text-white">
        <h1 className="text-sm font-normal text-white/80">Selesaikan pembayaran dalam</h1>
        <p className="mt-1 font-mono text-4xl font-bold tabular-nums" role="timer" aria-live="off">{mmss(left)}</p>
        <p className="mt-1 text-xs text-white/70">Slot ditahan {HOLD_MINUTES} menit untukmu.</p>
      </header>
      <div className="space-y-6 p-6">
        <div className="flex items-end justify-between gap-4 border-b pb-4">
          <div>
            <p className="text-xs text-muted-foreground">Total · {methodLabel(b)}</p>
            <p className="text-2xl font-bold text-primary tabular-nums">{formatIDR(b.total)}</p>
          </div>
          <p className="text-right text-xs text-muted-foreground">{venue}<br />{court} · {when(b)}</p>
        </div>
        <PayMethodBlock b={b} />
        <div className="grid gap-3">
          <Button variant="cta" size="lg" onClick={() => updateBooking(b.id, { status: "paid", paidAt: new Date().toISOString() })}>
            Saya sudah bayar (demo)
          </Button>
          <Button variant="ghost" onClick={() => updateBooking(b.id, { status: "cancelled", cancelledAt: new Date().toISOString() })}>
            Batalkan pesanan
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">Mode demo: tombol di atas menggantikan konfirmasi otomatis dari penyedia pembayaran.</p>
      </div>
    </Card>
  );
}

// ---------------- Detail / Booking berhasil ----------------

const HEAD: Record<ShownStatus, { icon: typeof CircleCheck; title: string; sub: string; tone: string }> = {
  paid: { icon: CircleCheck, title: "Booking berhasil!", sub: "Lapanganmu sudah dipesan.", tone: "bg-ok-soft text-ok" },
  pending: { icon: Clock, title: "Menunggu pembayaran", sub: "", tone: "bg-victory/5 text-victory" },
  done: { icon: CircleCheck, title: "Selesai", sub: "Semoga seru mainnya!", tone: "bg-secondary text-primary" },
  cancelled: { icon: CircleX, title: "Booking dibatalkan", sub: "Slot sudah dibuka lagi untuk pemain lain.", tone: "bg-muted text-muted-foreground" },
  expired: { icon: Hourglass, title: "Kedaluwarsa", sub: "Pembayaran tidak selesai tepat waktu.", tone: "bg-muted text-muted-foreground" },
};

export function BookingDetail() {
  use(browser("Bookings are stored in localStorage."));
  const b = useOwnBooking();
  const now = useNow();
  if (!b) return <NotFound />;
  const s = shownStatus(b, now);
  const { venue, court } = where(b);
  const head = HEAD[s];
  const rebook = `/venue/${b.venueSlug}?court=${b.courtId}&date=${nextSameWeekday(b.date, now)}`;
  const cancellable = canCancel(b, now);
  const cancel = () => updateBooking(b.id, { status: "cancelled", cancelledAt: new Date().toISOString() });

  return (
    <>
      <Link href="/bookings" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline print:hidden">
        <ArrowLeft className="size-4" aria-hidden /> Booking Saya
      </Link>
      <Card className="gap-0 overflow-hidden rounded-2xl py-0 ring-border">
        <header className={clsx("px-6 py-8 text-center", head.tone)}>
          <head.icon className="mx-auto size-14" aria-hidden />
          <h1 className="mt-3 text-2xl font-bold text-primary">{head.title}</h1>
          <p className="mt-1 text-sm">{s === "pending" ? `Selesaikan dalam ${mmss(new Date(b.holdExpiresAt!).getTime() - now.getTime())}` : head.sub}</p>
        </header>
        <div className="space-y-6 p-6">
          <div className="rounded-xl bg-muted p-4 text-center">
            <p className="text-xs text-muted-foreground">Kode booking</p>
            <p className="mt-1 font-mono text-xl font-bold tracking-wider text-primary">{b.id}</p>
            <div className="mt-2"><StatusBadge s={s} /></div>
          </div>

          <section>
            <h2 className="font-semibold">Detail booking</h2>
            <ul className="mt-3 space-y-3 text-sm">
              <li className="flex gap-3"><MapPin className="size-5 shrink-0 text-primary" aria-hidden /><span><b className="block font-medium">{venue}</b><span className="text-muted-foreground">{court}</span></span></li>
              <li className="flex gap-3"><CalendarDays className="size-5 shrink-0 text-primary" aria-hidden />{formatDate(b.date)}</li>
              <li className="flex gap-3"><Clock className="size-5 shrink-0 text-primary" aria-hidden /><span><b className="block font-medium tabular-nums">{hourLabel(b.hour)}–{hourLabel(b.hour + 1)}</b><span className="text-muted-foreground">Durasi 1 jam</span></span></li>
              <li className="flex gap-3"><User className="size-5 shrink-0 text-primary" aria-hidden /><span className="min-w-0"><b className="block font-medium">{b.name}{b.team ? ` · ${b.team}` : ""}</b><span className="break-all text-muted-foreground">{b.email} · {b.phone}</span></span></li>
            </ul>
          </section>

          <section className="border-t pt-5">
            <h2 className="font-semibold">Pembayaran</h2>
            <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1.5 text-sm tabular-nums">
              <dt className="text-muted-foreground">Harga sewa</dt><dd>{formatIDR(b.subtotal)}</dd>
              <dt className="text-muted-foreground">Biaya pembayaran ({methodLabel(b)})</dt><dd>{formatIDR(b.fee)}</dd>
              {b.discount > 0 && (<><dt className="text-ok">Diskon {b.voucher}</dt><dd className="text-ok">−{formatIDR(b.discount)}</dd></>)}
              <dt className="mt-2 border-t pt-2 font-semibold">{s === "paid" || s === "done" ? "Total dibayar" : "Total"}</dt>
              <dd className="mt-2 border-t pt-2 text-lg font-bold text-primary">{formatIDR(b.total)}</dd>
            </dl>
          </section>

          {s === "paid" && (
            <section className="rounded-xl bg-secondary p-4 text-sm">
              <h2 className="font-semibold text-primary">Penting</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-secondary-foreground/80">
                <li>Datang 15 menit sebelum jadwal.</li>
                <li>Tunjukkan kode booking dan kartu identitas di meja venue.</li>
                <li>Pembatalan paling lambat {CANCEL_HOURS} jam sebelum jadwal.</li>
              </ul>
            </section>
          )}

          <div className="grid gap-3 sm:grid-cols-2 print:hidden">
            {s === "pending" && (
              <Link href={`/booking/${b.id}/bayar`} className={buttonVariants({ variant: "cta", size: "lg", className: "sm:col-span-2" })}>Lanjutkan bayar</Link>
            )}
            {(s === "paid" || s === "done") && (
              <Button variant="outline" size="lg" onClick={() => window.print()}><Download aria-hidden />Unduh bukti</Button>
            )}
            {s !== "pending" && (
              <Link href={rebook} className={buttonVariants({ variant: s === "paid" ? "default" : "cta", size: "lg", className: s === "paid" || s === "done" ? "" : "sm:col-span-2" })}>Pesan lagi</Link>
            )}
            {cancellable && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="lg" className="sm:col-span-2">Batalkan booking</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Batalkan booking ini?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {court}, {when(b)} akan dibuka lagi untuk pemain lain. Pengembalian dana mengikuti kebijakan INA Sports.
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
    { id: "upcoming", label: "Akan datang", list: mine.filter((x) => x.s === "pending" || x.s === "paid").sort((x, y) => start(x.b) - start(y.b)), empty: "Belum ada booking yang akan datang." },
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
                        <span className="block text-sm text-muted-foreground">{court} · <span className="tabular-nums">{when(b)}</span></span>
                        <span className="mt-2 block"><StatusBadge s={s} /></span>
                      </span>
                      <span className="text-right">
                        <span className="block font-mono text-xs text-muted-foreground">{b.id}</span>
                        <span className="block font-semibold tabular-nums">{formatIDR(b.total)}</span>
                      </span>
                    </Link>
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
