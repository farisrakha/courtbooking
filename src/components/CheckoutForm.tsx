"use client";

// PRD F4: login gate → player data (prefilled) → payment method → voucher → "Bayar" creates a
// "Menunggu pembayaran" booking that holds the slot for HOLD_MINUTES, then shows payment instructions.
// UI-09: Event/Tribun checkouts add tax, "Bayar Lunas" vs "DP 50%", a payment schedule and the Uang Jaminan; no voucher.
// UI-07: persiapan & bongkar days ride along as &pre=&post=. UI-10: a supporting letter, and special-tariff requests
// wait for an admin ("Menunggu Verifikasi Admin") before any payment.
import Link from "next/link";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { use, useState } from "react";
import { browser } from "react-dom";
import { ArrowLeft, ChevronDown, CreditCard, FileText, Info, Landmark, MailWarning, QrCode, Ticket, User, Wallet } from "lucide-react";
import clsx from "clsx";
import { displayPhone, normalizePhone, phoneOk } from "@/lib/auth";
import {
  DEPOSIT_PCT, DP_PCT, HOLD_MINUTES, LOADING_MAX_SIDE, PAYMENT_METHODS, TAX_PCT, blockHours, blockLength, eventQuote,
  findVoucher, formatDate, formatIDR, hourLabel, isDayLocked, isRoomTaken, isSlotTaken, isoDate, quote, retailPrice,
  roomOpenOn, roomPrice, saveBooking, type Booking, type PaymentMethodId, type Scheme, type Tier,
} from "@/lib/booking";
import { getVenue, hasClub, unitLabel } from "@/lib/venues";
import { EVENT_DAYS, loadingDates } from "./EventPicker";
import { ROOM_DAYS } from "./RoomPicker";
import { StickyBar } from "./StickyBar";
import { useBookings, useUser } from "@/lib/useStore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const ICONS = { qris: QrCode, ewallet: Wallet, bca: Landmark, mandiri: Landmark, card: CreditCard };
const enc = encodeURIComponent;
const field = "h-11 rounded-xl";

const MAX_DOC_MB = 5;
const DOC_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const short = (d: string) => formatDate(d, { weekday: "short", day: "numeric", month: "short" });
const dayAfter = (now: Date, k: number) => isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + k));

/** Validates the slot (retail) or the package + dates (event) from the URL. Returns null if it can't be booked. */
function readSlot(p: URLSearchParams, bookings: Booking[]) {
  const venue = getVenue(p.get("venue") ?? "");
  if (!venue || venue.comingSoon) return null;
  const now = new Date();

  const pkg = venue.packages?.find((x) => x.id === p.get("pkg"));
  if (p.has("pkg")) {
    const dates = [...new Set((p.get("dates") ?? "").split(","))].sort();
    const first = dayAfter(now, 1), last = dayAfter(now, EVENT_DAYS);
    const side = (k: string) => Number(p.get(k) ?? 0);
    const pre = side("pre"), post = side("post");
    if (![pre, post].every((n) => Number.isInteger(n) && n >= 0 && n <= LOADING_MAX_SIDE)) return null;
    if (!pkg || !dates.length || dates.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d) || d < first || d > last || isDayLocked(venue.slug, d, bookings, now))) return null;
    const loads = loadingDates(dates, pre, post);
    if (loads.some((d) => d < first || dates.includes(d) || isDayLocked(venue.slug, d, bookings, now))) return null;
    return { kind: "event" as const, venue, pkg, dates, loads };
  }

  // UI-08 rooms ride the retail path (100% payment); the room stands in for the court.
  const room = venue.rooms?.find((r) => r.id === p.get("room"));
  if (p.has("room")) {
    const date = p.get("date") ?? "";
    const hour = Number(p.get("hour")), hours = Number(p.get("hours"));
    const dayLen = venue.close - venue.open;
    if (!room || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < isoDate(now) || date > dayAfter(now, ROOM_DAYS - 1) || !roomOpenOn(room, date)) return null;
    const okLen = room.unit === "jam" ? Number.isInteger(hours) && hours >= 1 && hours <= 8 && hour >= venue.open && hour + hours <= venue.close : hour === venue.open && hours === dayLen;
    if (!okLen || !Number.isInteger(hour)) return null;
    if (date === isoDate(now) && (room.unit === "jam" ? hour <= now.getHours() : now.getHours() >= venue.open)) return null;
    if (isRoomTaken(venue.slug, room, date, hour, hours, bookings, now)) return null;
    const court = { id: room.id, name: room.name, surface: `${room.area} m², kapasitas ${room.capacity} orang`, tariff: { weekday: room.price } };
    return { kind: "retail" as const, venue, court, date, hour, len: hours, tier: undefined, price: roomPrice(room, hours), room };
  }

  const court = venue.courts.find((c) => c.id === p.get("court"));
  const date = p.get("date") ?? "";
  const hour = Number(p.get("hour"));
  if (!court || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !blockHours(venue).includes(hour)) return null;
  const visit = venue.block === "visit";
  const len = blockLength(venue);
  const tier: Tier | undefined = visit ? "perorangan" : hasClub(venue) ? (p.get("tier") === "klub" ? "klub" : "perorangan") : undefined;

  const today = isoDate(now);
  if (date < today || date > dayAfter(now, 6)) return null;
  if (date === today && (visit ? now.getHours() >= venue.close - 1 : hour <= now.getHours())) return null;
  if (isSlotTaken(venue.slug, court.id, date, hour, bookings, now, len)) return null;
  return { kind: "retail" as const, venue, court, date, hour, len, tier, price: retailPrice(venue, court, date, hour, tier), room: undefined };
}

export function CheckoutForm() {
  use(browser("Checkout validates the slot against the clock and saved bookings."));
  const params = useSearchParams();
  const router = useRouter();
  const user = useUser();
  const bookings = useBookings();
  const [placing, setPlacing] = useState(false); // our own new hold makes the slot "taken"; don't flash the error
  const [method, setMethod] = useState<PaymentMethodId | "">("");
  const [scheme, setScheme] = useState<Scheme>("lunas");
  const [code, setCode] = useState("");
  const [voucher, setVoucher] = useState("");
  const [voucherMsg, setVoucherMsg] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [doc, setDoc] = useState(""); // file name only in the demo
  const [special, setSpecial] = useState(false);

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

  const { venue } = slot;
  const ev = slot.kind === "event" ? slot : null;
  const rt = slot.kind === "retail" ? slot : null;
  // QRIS has no fee, so "no method yet" shows fee 0.
  const eq = ev ? eventQuote(ev.pkg.price, ev.dates.length, scheme, method || "qris", ev.loads.length) : null;
  const cost = eq ?? quote(rt!.price, method || "qris", voucher);
  const dueNow = eq ? eq.dueNow : cost.total;
  const later = eq ? eq.total - eq.dueNow : 0; // DP balance, its own payment fee comes at settlement
  const review = !!ev && special;
  const unit = unitLabel(venue);

  function pickDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const bad = file && (!DOC_TYPES.includes(file.type) ? "Format harus PDF, JPG, atau PNG." : file.size > MAX_DOC_MB * 1024 * 1024 ? `Ukuran maksimal ${MAX_DOC_MB} MB.` : "");
    setDoc(file && !bad ? file.name : "");
    setErrors((x) => ({ ...x, doc: bad || "" }));
    if (bad) e.target.value = "";
  }

  function applyVoucher() {
    const v = findVoucher(code);
    setVoucher(v ? code.trim().toUpperCase() : "");
    setVoucherMsg(v ? `Voucher dipakai. Kamu hemat ${formatIDR(quote(rt!.price, "qris", code).discount)}.` : "Kode voucher tidak valid.");
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const err: Record<string, string> = {};
    if (!f.name?.trim()) err.name = ev ? "Isi nama penanggung jawab." : "Isi nama pemain.";
    if (!/^\S+@\S+\.\S+$/.test(f.email ?? "")) err.email = "Format email belum benar.";
    if (!phoneOk(f.phone ?? "")) err.phone = "Nomor WhatsApp belum benar, contoh 081234567890.";
    if (!method && !review) err.method = "Pilih metode pembayaran.";
    if (review && !doc) err.doc = "Unggah surat rekomendasi untuk mengajukan tarif khusus.";
    setErrors(err);
    const first = Object.keys(err)[0];
    if (first) { document.getElementById(first === "method" ? "pm-qris" : first)?.focus(); return; }
    if (!user!.verified || (!method && !review)) return;

    const now = new Date();
    const id = `INA-${now.getTime().toString(36).toUpperCase()}`;
    setPlacing(true);
    const common = {
      id, userEmail: user!.email, status: "pending" as const, venueSlug: venue.slug, method: method || "qris",
      name: f.name.trim(), email: f.email.trim(), phone: normalizePhone(f.phone), team: f.team?.trim() || undefined,
      createdAt: now.toISOString(), holdExpiresAt: new Date(now.getTime() + HOLD_MINUTES * 60_000).toISOString(),
    };
    if (ev) {
      saveBooking({
        ...common, ...eventQuote(ev.pkg.price, ev.dates.length, scheme, method || "qris", ev.loads.length), type: ev.pkg.type, pkg: ev.pkg.id,
        scheme, courtId: "all", date: ev.dates[0], dates: ev.dates, loadDates: ev.loads.length ? ev.loads : undefined,
        hour: venue.open, hours: ev.pkg.hours, doc: doc || undefined, special: review || undefined,
        // A special-tariff request waits for the admin; the hold starts when it's approved.
        ...(review ? { status: "review" as const, holdExpiresAt: undefined } : {}),
      });
      router.push(review ? `/booking/${id}` : `/booking/${id}/bayar`);
      return;
    } else {
      saveBooking({
        ...common, ...quote(rt!.price, method || "qris", voucher), voucher: voucher || undefined, type: rt!.room ? "Ruangan" : "Retail",
        courtId: rt!.court.id, date: rt!.date, hour: rt!.hour, hours: rt!.len, tier: rt!.tier,
      });
    }
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
            <h2 className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
              Ringkasan booking <Badge variant={ev ? "default" : "secondary"}>{ev ? ev.pkg.type : rt?.room ? "Ruangan" : "Retail"}</Badge>
            </h2>
            <div className="mt-3 rounded-xl bg-secondary p-4">
              <p className="font-semibold text-primary">{venue.name}</p>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">Lokasi</dt><dd className="text-right">{venue.location}</dd>
                {ev ? (
                  <>
                    <dt className="text-muted-foreground">Paket</dt><dd className="text-right">{ev.pkg.label}</dd>
                    <dt className="text-muted-foreground">Hari acara</dt>
                    <dd className="text-right">{ev.dates.map(short).join(" · ")}</dd>
                    <dt className="text-muted-foreground">Lama acara</dt><dd className="text-right">{ev.dates.length} hari × {ev.pkg.hours} jam</dd>
                    {ev.loads.length > 0 && (<><dt className="text-muted-foreground">Persiapan & bongkar</dt><dd className="text-right">{ev.loads.map(short).join(" · ")}</dd></>)}
                  </>
                ) : (
                  <>
                    <dt className="text-muted-foreground">{unit}</dt><dd className="text-right">{rt!.court.name} ({rt!.court.surface})</dd>
                    {rt!.tier && venue.block !== "visit" && (<><dt className="text-muted-foreground">Jenis sewa</dt><dd className="text-right">{rt!.tier === "klub" ? "Sewa Klub" : "Sewa Perorangan"}</dd></>)}
                    <dt className="text-muted-foreground">Tanggal</dt><dd className="text-right">{formatDate(rt!.date)}</dd>
                    <dt className="text-muted-foreground">Jam</dt><dd className="text-right tabular-nums">{hourLabel(rt!.hour)}–{hourLabel(rt!.hour + rt!.len)}</dd>
                    <dt className="text-muted-foreground">Durasi</dt><dd className="text-right">{venue.block === "visit" ? "1 kedatangan" : rt!.room?.unit === "hari" ? "Sehari penuh" : `${rt!.len} jam`}</dd>
                  </>
                )}
              </dl>
              <p className="mt-3 flex justify-between border-t border-primary/10 pt-3 font-semibold">
                <span>Harga sewa</span><span className="text-primary tabular-nums">{formatIDR(cost.subtotal)}</span>
              </p>
              {ev && !review && (
                <p className="mt-1 flex justify-between text-sm">
                  <span className="text-muted-foreground">Bayar hari ini ({scheme === "dp" ? `DP ${DP_PCT}%` : "lunas"})</span><span className="font-semibold tabular-nums">{formatIDR(dueNow)}</span>
                </p>
              )}
            </div>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              <li>{ev ? "Tanggal" : "Slot"} ditahan {HOLD_MINUTES} menit setelah kamu menekan Bayar.</li>
              <li>Bukti booking dikirim ke email dan WhatsApp kamu.</li>
              {/* ponytail: placeholder, LPUK event cancellation policy unknown */}
              <li>{ev ? "Pembatalan dan pengembalian dana mengikuti ketentuan LPUK." : "Pembatalan paling lambat 2 jam sebelum jadwal."}</li>
              {ev ? <li>Listrik, air, dan service charge ditagih terpisah sesuai pemakaian.</li> : <li>Datang 15 menit lebih awal dan bawa kartu identitas.</li>}
            </ul>
          </Card>
        </aside>

        <Card className="gap-0 rounded-2xl p-5 ring-border sm:p-6">
          <form id="checkout-form" onSubmit={submit} noValidate className="space-y-8">
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
              <legend className="mb-4 flex items-center gap-2 font-semibold text-primary"><User className="size-5" aria-hidden />{ev ? "Data penyelenggara" : "Data pemain"}</legend>
              <p className="-mt-2 text-xs text-muted-foreground">Diisi dari profilmu. Perubahan di sini hanya untuk booking ini.</p>
              <div className="space-y-1.5"><Label htmlFor="name">{ev ? "Nama penanggung jawab *" : "Nama lengkap *"}</Label><Input id="name" name="name" autoComplete="name" defaultValue={user.name} className={field} {...aria("name")} />{err("name")}</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="email">Email *</Label><Input id="email" name="email" type="email" autoComplete="email" defaultValue={user.email} className={field} {...aria("email")} />{err("email")}</div>
                <div className="space-y-1.5"><Label htmlFor="phone">No. WhatsApp *</Label><Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={displayPhone(user.phone)} className={field} {...aria("phone")} />{err("phone")}</div>
              </div>
              {ev ? (
                <div className="space-y-1.5"><Label htmlFor="team">Nama acara / instansi <span className="font-normal text-muted-foreground">(opsional)</span></Label><Input id="team" name="team" className={field} placeholder="Contoh: Kejuaraan Futsal Antarklub 2026" /></div>
              ) : (
                <div className="space-y-1.5"><Label htmlFor="team">Nama tim <span className="font-normal text-muted-foreground">(opsional)</span></Label><Input id="team" name="team" defaultValue={user.team} className={field} placeholder="Kalau main bareng tim" /></div>
              )}
            </fieldset>

            {ev && (
              <fieldset>
                <legend className="font-semibold text-primary">Skema pembayaran *</legend>
                <RadioGroup value={scheme} onValueChange={(v) => setScheme(v as Scheme)} className="mt-3 gap-0 divide-y overflow-hidden rounded-xl border">
                  {([
                    ["lunas", "Bayar Lunas 100%", "Bayar seluruh sewa dan pajak sekarang."],
                    ["dp", `Uang Muka (DP) ${DP_PCT}%`, "Bayar setengah sekarang, lunasi sebelum hari acara."],
                  ] as const).map(([id, label, note]) => (
                    <Label key={id} htmlFor={`sc-${id}`} className={clsx("flex cursor-pointer items-center gap-3 p-3 font-normal transition-colors", scheme === id ? "bg-secondary" : "hover:bg-muted")}>
                      <span className="flex-1">
                        <span className="block text-sm font-medium">{label}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{note}</span>
                      </span>
                      <RadioGroupItem value={id} id={`sc-${id}`} />
                    </Label>
                  ))}
                </RadioGroup>
              </fieldset>
            )}

            {ev && (
              <fieldset className="space-y-3">
                <legend className="flex items-center gap-2 font-semibold text-primary"><FileText className="size-5" aria-hidden />Tarif & dokumen</legend>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3">
                  <input type="checkbox" checked={special} onChange={(e) => setSpecial(e.target.checked)} className="mt-1 size-4 accent-[var(--color-integrity)]" />
                  <span>
                    <span className="block text-sm font-medium">Ajukan tarif khusus instansi / federasi</span>
                    <span className="block text-xs text-muted-foreground">Untuk kegiatan Kementerian, Lembaga, Federasi, atau Kejuaraan Nasional. Booking menunggu verifikasi admin LPUK dulu; kamu pilih cara bayar setelah disetujui.</span>
                  </span>
                </label>
                <div>
                  <p className="text-sm font-medium">
                    {special ? "Surat rekomendasi instansi / federasi *" : <>Surat permohonan kegiatan <span className="font-normal text-muted-foreground">(opsional)</span></>}
                  </p>
                  <p className="text-xs text-muted-foreground">PDF, JPG, atau PNG, maksimal {MAX_DOC_MB} MB.</p>
                  <div className="mt-2 flex items-center gap-3">
                    <label htmlFor="doc" className={buttonVariants({ variant: "outline", className: "cursor-pointer" })}>Pilih file</label>
                    <input id="doc" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={pickDoc} className="sr-only" {...aria("doc")} />
                    <span className={clsx("min-w-0 truncate text-sm", doc ? "text-ok" : "text-muted-foreground")}>{doc || "Belum ada file"}</span>
                  </div>
                  <div className="mt-1.5">{err("doc")}</div>
                </div>
              </fieldset>
            )}

            {!review && (
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
            )}

            {!ev && !rt?.room && <details className="group rounded-xl border" open={!!voucher}>
              <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
                <span className="grid size-10 place-items-center rounded-lg bg-secondary text-primary"><Ticket className="size-5" aria-hidden /></span>
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
            </details>}

            <section className="rounded-xl bg-muted p-4">
              <h2 className="font-semibold">Rincian biaya</h2>
              <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1.5 text-sm tabular-nums">
                <dt className="text-muted-foreground">{ev ? `Sewa utama (${ev.dates.length} hari)` : "Harga sewa"}</dt><dd>{formatIDR(cost.subtotal)}</dd>
                {ev && eq!.loading > 0 && (<><dt className="text-muted-foreground">Persiapan & bongkar ({ev.loads.length} hari)</dt><dd>{formatIDR(eq!.loading)}</dd></>)}
                {ev && (<><dt className="text-muted-foreground">Pajak ({TAX_PCT}%)</dt><dd>{formatIDR(eq!.tax)}</dd></>)}
                {!review && (<><dt className="text-muted-foreground">Biaya pembayaran{ev && scheme === "dp" ? " (DP)" : ""}</dt><dd>{method ? formatIDR(cost.fee) : "–"}</dd></>)}
                {cost.discount > 0 && (<><dt className="text-ok">Diskon voucher</dt><dd className="text-ok">−{formatIDR(cost.discount)}</dd></>)}
                <dt className="mt-2 border-t pt-2 font-semibold">{ev ? "Total sewa" : "Total"}</dt>
                <dd className={clsx("mt-2 border-t pt-2", ev ? "font-semibold" : "text-lg font-bold text-primary")}>{formatIDR(cost.total)}</dd>
              </dl>
              {ev && (
                // What is paid when: today, before the event, and separately.
                <ol className="mt-4 space-y-3 border-t pt-4 text-sm">
                  <li className="flex items-start justify-between gap-3">
                    <span><b className="block">{review ? "Setelah disetujui admin" : "Hari ini"}</b><span className="text-xs text-muted-foreground">{scheme === "dp" ? `Uang muka ${DP_PCT}%` : "Lunas 100%"}</span></span>
                    <span className="text-xl font-bold text-primary tabular-nums">{formatIDR(dueNow)}</span>
                  </li>
                  {scheme === "dp" && (
                    <li className="flex items-start justify-between gap-3">
                      <span><b className="block">Sebelum hari acara</b><span className="text-xs text-muted-foreground">Pelunasan, ditambah biaya pembayaran saat itu</span></span>
                      <span className="font-semibold tabular-nums">{formatIDR(later)}</span>
                    </li>
                  )}
                  <li className="flex items-start justify-between gap-3">
                    <span><b className="block">Terpisah</b><span className="text-xs text-muted-foreground">Uang Jaminan {DEPOSIT_PCT}% sesuai ketentuan LPUK, plus listrik, air, dan service charge sesuai pemakaian</span></span>
                    <span className="font-semibold tabular-nums">{formatIDR(eq!.deposit)}</span>
                  </li>
                </ol>
              )}
            </section>

            <div>
              <div className="hidden sm:block">
                <Button type="submit" variant="cta" size="lg" className="w-full" disabled={!user.verified}>{review ? "Kirim pengajuan" : `Bayar ${formatIDR(dueNow)}`}</Button>
              </div>
              <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                <Info className="mt-px size-3.5 shrink-0" aria-hidden />
                Mode demo: belum terhubung ke payment gateway, booking disimpan di browser ini.
              </p>
            </div>
            <StickyBar>
              <p className="min-w-0 flex-1 text-sm">
                <span className="block text-xs text-muted-foreground">{review ? "Menunggu verifikasi admin" : ev ? (scheme === "dp" ? `DP ${DP_PCT}% hari ini` : "Lunas hari ini") : "Total"}</span>
                <span className="block font-bold text-primary tabular-nums">{formatIDR(dueNow)}</span>
              </p>
              <Button type="submit" form="checkout-form" variant="cta" size="lg" disabled={!user.verified}>{review ? "Kirim" : "Bayar"}</Button>
            </StickyBar>
          </form>
        </Card>
      </div>
    </>
  );
}
