"use client";

// UI-06/07: Event & Tribun rent the whole venue per day. Pick a package, one or more dates, and optional
// persiapan (before) and bongkar (after) days at 50%.
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { use, useState } from "react";
import { browser } from "react-dom";
import { CalendarRange, ChevronLeft, ChevronRight, Info, Minus, Plus } from "lucide-react";
import clsx from "clsx";
import { DEPOSIT_PCT, LOADING_HALF_DAYS, LOADING_MAX_SIDE, TAX_PCT, formatDate, formatIDR, isDayLocked, isoDate, loadingCost } from "@/lib/booking";
import { useBookings } from "@/lib/useStore";
import { eventLabel, type Venue } from "@/lib/venues";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SlotPicker } from "./SlotPicker";
import { StickyBar } from "./StickyBar";

export const EVENT_DAYS = 60; // bookable event window, starting tomorrow
const WEEK = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

/** ISO date shifted by k days (local calendar). */
export const shiftDay = (iso: string, k: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return isoDate(new Date(y, m - 1, d + k));
};

/** Persiapan days before the first event day and bongkar days after the last one. */
export const loadingDates = (dates: string[], pre: number, post: number) => [
  ...Array.from({ length: pre }, (_, k) => shiftDay(dates[0], -(pre - k))),
  ...Array.from({ length: post }, (_, k) => shiftDay(dates.at(-1)!, k + 1)),
];

/** "Sewa Lapangan" / "Sewa Event & Tribun" on venues that sell packages; ?mode=event opens the second tab. */
export function VenueModes({ venue }: { venue: Venue }) {
  const mode = useSearchParams().get("mode") === "event" ? "event" : "retail";
  return (
    <Tabs defaultValue={mode} className="gap-4">
      <TabsList className="h-11 w-full">
        <TabsTrigger value="retail" className="px-3">Sewa Lapangan</TabsTrigger>
        <TabsTrigger value="event" className="px-3">{eventLabel(venue)}</TabsTrigger>
      </TabsList>
      <TabsContent value="retail"><SlotPicker venue={venue} /></TabsContent>
      <TabsContent value="event"><EventPicker venue={venue} /></TabsContent>
    </Tabs>
  );
}

function Stepper({ label, note, value, max, onChange }: { label: string; note: string; value: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{note}</span>
      </span>
      <span className="flex items-center gap-2">
        <Button type="button" variant="outline" size="icon" aria-label={`Kurangi ${label.toLowerCase()}`} disabled={value === 0} onClick={() => onChange(value - 1)}><Minus aria-hidden /></Button>
        <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">{value}</span>
        <Button type="button" variant="outline" size="icon" aria-label={`Tambah ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}><Plus aria-hidden /></Button>
      </span>
    </div>
  );
}

export function EventPicker({ venue }: { venue: Venue }) {
  use(browser("Event availability depends on the current date and saved bookings."));
  const bookings = useBookings();
  const packages = venue.packages ?? [];
  const params = useSearchParams();
  const [pkgId, setPkgId] = useState(() => packages.find((p) => p.id === params.get("pkg"))?.id ?? packages[0]?.id);
  const [dates, setDates] = useState<string[]>([]);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rangeMode, setRangeMode] = useState(false); // touch-friendly: tap the first day, then the last
  const [loading, setLoading] = useState(false);
  const [pre, setPre] = useState(1);
  const [post, setPost] = useState(1);
  const pkg = packages.find((p) => p.id === pkgId);

  const now = new Date();
  const first = isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const days = Array.from({ length: EVENT_DAYS }, (_, k) => shiftDay(first, k));
  const months = days.reduce<string[][]>((acc, d) => {
    const last = acc.at(-1);
    if (last && last[0].slice(0, 7) === d.slice(0, 7)) last.push(d);
    else acc.push([d]);
    return acc;
  }, []);
  const shown = months.slice(page, page + 2);
  const locked = (d: string) => isDayLocked(venue.slug, d, bookings, now);

  function pick(d: string, shift: boolean) {
    if ((shift || rangeMode) && anchor && anchor !== d) {
      const [a, b] = [anchor, d].sort();
      const span = days.filter((x) => x >= a && x <= b && !locked(x));
      setDates((xs) => [...new Set([...xs, ...span])].sort());
      setAnchor(null);
      return;
    }
    setDates((xs) => (xs.includes(d) ? xs.filter((x) => x !== d) : [...xs, d].sort()));
    setAnchor(d);
  }

  // How many free days sit right before the first / after the last event day (the steppers stop there).
  const freeRun = (step: 1 | -1) => {
    if (!dates.length) return LOADING_MAX_SIDE;
    let n = 0;
    while (n < LOADING_MAX_SIDE) {
      const d = shiftDay(step < 0 ? dates[0] : dates.at(-1)!, step * (n + 1));
      if (d < first || dates.includes(d) || locked(d)) break;
      n++;
    }
    return n;
  };
  const maxPre = freeRun(-1), maxPost = freeRun(1);
  const effPre = Math.min(pre, maxPre), effPost = Math.min(post, maxPost);
  const loads = loading && dates.length ? loadingDates(dates, effPre, effPost) : [];
  const badLoad = loads.find((d) => d < first || locked(d) || dates.includes(d));
  const rent = pkg ? pkg.price * dates.length : 0;
  const loadCost = pkg ? loadingCost(pkg.price, loads.length) : 0;
  const ready = pkg && dates.length > 0 && !badLoad;
  const href = ready ? `/checkout?venue=${venue.slug}&pkg=${pkg.id}&dates=${dates.join(",")}${loads.length ? `&pre=${effPre}&post=${effPost}` : ""}` : null;
  const blocked = badLoad ? "Ubah hari persiapan/bongkar" : "Pilih tanggal dulu";
  const short = (d: string) => formatDate(d, { day: "numeric", month: "short" });

  return (
    <Card className="gap-0 rounded-2xl p-5 ring-border sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-integrity">
        <CalendarRange className="size-5" aria-hidden /> {eventLabel(venue)}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Seluruh venue dipakai untuk acaramu: kejuaraan, ujian, atau kegiatan instansi.</p>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-medium">Jenis paket</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {packages.map((p) => {
            const on = p.id === pkgId;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() => setPkgId(p.id)}
                className={clsx("rounded-xl border p-3 text-left transition-colors", on ? "border-integrity bg-integrity text-white" : "border-line hover:border-integrity")}
              >
                <span className={clsx("text-xs font-semibold", on ? "text-white/80" : "text-muted-foreground")}>{p.type}</span>
                <span className="block font-semibold">{p.label}</span>
                <span className="mt-1 block text-sm tabular-nums">{formatIDR(p.price)} <span className="opacity-80">/ {p.hours === 16 ? "hari" : "12 jam"}</span></span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-6 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <legend className="text-sm font-medium">Tanggal acara</legend>
            <p className="text-xs text-muted-foreground">Ketuk satu atau beberapa hari. Tanggal abu-abu sudah terpakai.</p>
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-primary">
              <input type="checkbox" checked={rangeMode} onChange={(e) => { setRangeMode(e.target.checked); setAnchor(null); }} className="size-4 accent-[var(--color-integrity)]" />
              Pilih rentang: ketuk hari pertama, lalu hari terakhir
            </label>
          </div>
          <span className="flex shrink-0 gap-1">
            <Button type="button" variant="outline" size="icon" aria-label="Bulan sebelumnya" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft aria-hidden /></Button>
            <Button type="button" variant="outline" size="icon" aria-label="Bulan berikutnya" disabled={page + 2 >= months.length} onClick={() => setPage(page + 1)}><ChevronRight aria-hidden /></Button>
          </span>
        </div>
        <div className="mt-3 grid gap-6 sm:grid-cols-2">
          {shown.map((m) => {
            const [y, mo] = m[0].split("-").map(Number);
            return (
              <div key={m[0]}>
                <p className="mb-2 text-sm font-semibold text-primary">{formatDate(m[0], { month: "long", year: "numeric" })}</p>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {WEEK.map((w) => <span key={w} className="pb-1 text-xs font-medium text-muted-foreground">{w}</span>)}
                  {Array.from({ length: (new Date(y, mo - 1, Number(m[0].slice(8))).getDay() + 6) % 7 }, (_, k) => <span key={`x${k}`} />)}
                  {m.map((iso) => {
                    const off = locked(iso);
                    const on = dates.includes(iso);
                    const load = loads.includes(iso);
                    return (
                      <button
                        key={iso}
                        type="button"
                        disabled={off}
                        aria-pressed={on}
                        title={off ? "Terpakai" : undefined}
                        aria-label={`${formatDate(iso)}${off ? ", terpakai" : on ? ", dipilih" : load ? ", hari persiapan atau bongkar" : ""}`}
                        onClick={(e) => pick(iso, e.shiftKey)}
                        className={clsx(
                          "aspect-square min-h-10 rounded-lg text-sm tabular-nums outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                          rangeMode && anchor === iso && "ring-2 ring-integrity ring-offset-1",
                          on && "bg-integrity font-semibold text-white",
                          !on && load && "border border-dashed border-integrity bg-integrity-soft text-primary",
                          !on && !load && !off && "border border-ok/80 hover:border-ok hover:bg-ok-soft",
                          off && "cursor-not-allowed bg-platinum text-muted-foreground/70",
                        )}
                      >
                        {Number(iso.slice(8))}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5"><i className="size-3 rounded border border-ok bg-card" />Tersedia</li>
          <li className="flex items-center gap-1.5"><i className="size-3 rounded bg-integrity" />Hari acara</li>
          {loads.length > 0 && <li className="flex items-center gap-1.5"><i className="size-3 rounded border border-dashed border-integrity bg-integrity-soft" />Persiapan / bongkar</li>}
          <li className="flex items-center gap-1.5"><i className="size-3 rounded bg-platinum ring-1 ring-line" />Terpakai</li>
        </ul>
      </fieldset>

      <section className="mt-6 rounded-xl border p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={loading} onChange={(e) => setLoading(e.target.checked)} className="mt-1 size-4 accent-[var(--color-integrity)]" />
          <span>
            <span className="block text-sm font-medium">Tambah hari persiapan & pembongkaran</span>
            <span className="block text-xs text-muted-foreground">Tarif 50% per hari untuk {LOADING_HALF_DAYS} hari pertama, selanjutnya tarif penuh.</span>
          </span>
        </label>
        {loading && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <Stepper label="Hari persiapan" note={dates.length && !maxPre ? "Hari sebelumnya sudah terpakai" : "Sebelum hari pertama acara"} value={effPre} max={maxPre} onChange={setPre} />
            <Stepper label="Hari bongkar" note={dates.length && !maxPost ? "Hari setelahnya sudah terpakai" : "Setelah hari terakhir acara"} value={effPost} max={maxPost} onChange={setPost} />
            {dates.length > 0 && loads.length > 0 && (
              <p className={clsx("text-xs", badLoad ? "text-destructive" : "text-muted-foreground")}>
                {badLoad ? `${formatDate(badLoad, { day: "numeric", month: "long" })} tidak tersedia untuk persiapan atau bongkar. Kurangi jumlah harinya atau pilih tanggal acara lain.` : `Tanggal: ${loads.map(short).join(", ")}`}
              </p>
            )}
          </div>
        )}
      </section>

      {pkg && dates.length > 0 && (
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl bg-integrity-soft p-4 text-sm">
          <dt className="text-muted-foreground">Paket</dt><dd className="text-right font-medium">{pkg.label}</dd>
          <dt className="text-muted-foreground">Hari acara</dt><dd className="text-right font-medium">{dates.map(short).join(", ")}</dd>
          <dt className="text-muted-foreground">Sewa ({dates.length} hari)</dt><dd className="text-right tabular-nums">{formatIDR(rent)}</dd>
          {loads.length > 0 && (<><dt className="text-muted-foreground">Persiapan & bongkar ({loads.length} hari)</dt><dd className="text-right tabular-nums">{formatIDR(loadCost)}</dd></>)}
          <hr className="col-span-2 my-1.5 border-integrity/10" />
          <dt className="font-semibold">Subtotal</dt>
          <dd className="text-right text-base font-bold text-integrity tabular-nums">{formatIDR(rent + loadCost)}</dd>
          <dd className="col-span-2 text-right text-xs text-muted-foreground">+ pajak {TAX_PCT}% di halaman pembayaran</dd>
        </dl>
      )}
      <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-px size-3.5 shrink-0" aria-hidden />
        Tarif belum termasuk pajak, listrik, air, dan service charge. Bisa bayar lunas atau DP 50%. Ada Uang Jaminan {DEPOSIT_PCT}% dari sewa yang dibayar terpisah.
      </p>

      <div className="hidden sm:block">
        {href ? (
          <Link href={href} className={buttonVariants({ variant: "cta", size: "lg", className: "mt-5 w-full" })}>Lanjut ke pembayaran</Link>
        ) : (
          <button type="button" disabled className={buttonVariants({ variant: "cta", size: "lg", className: "mt-5 w-full" })}>{blocked}</button>
        )}
      </div>

      <StickyBar>
        <p className="min-w-0 flex-1 text-sm">
          {pkg && dates.length ? (
            <>
              <span className="block truncate font-medium">{dates.length} hari acara{loads.length ? ` + ${loads.length} hari persiapan/bongkar` : ""}</span>
              <span className="block font-bold text-primary tabular-nums">{formatIDR(rent + loadCost)} <span className="text-xs font-normal text-muted-foreground">+ pajak</span></span>
            </>
          ) : (
            <span className={badLoad ? "text-destructive" : "text-muted-foreground"}>{badLoad ? "Ubah hari persiapan/bongkar" : "Pilih tanggal acara"}</span>
          )}
        </p>
        {href ? (
          <Link href={href} className={buttonVariants({ variant: "cta", size: "lg" })}>Lanjut</Link>
        ) : (
          <button type="button" disabled className={buttonVariants({ variant: "cta", size: "lg" })}>Lanjut</button>
        )}
      </StickyBar>
    </Card>
  );
}
