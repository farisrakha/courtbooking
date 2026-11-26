"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { use, useState } from "react";
import { browser } from "react-dom";
import { CalendarDays } from "lucide-react";
import clsx from "clsx";
import {
  blockHours, blockLength, formatDate, formatIDR, hourLabel, isEventDay, isHoliday, isOffDay, isPeak, isSlotTaken, isoDate,
  retailPrice, type Tier,
} from "@/lib/booking";
import { useBookings } from "@/lib/useStore";
import { hasClub, unitLabel, type Venue } from "@/lib/venues";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StickyBar } from "./StickyBar";

const DAYS = 7;

type Sel = { courtId: string; hour: number } | null;
type SlotState = "free" | "selected" | "booked" | "club" | "event";

const TIERS: { id: Tier; label: string; note: string }[] = [
  { id: "perorangan", label: "Sewa Perorangan", note: "Tiket per orang" },
  { id: "klub", label: "Sewa Klub", note: "Satu unit untuk klubmu" },
];

const WORD: Record<SlotState, string> = { free: "Tersedia", selected: "Dipilih", booked: "Penuh", club: "Dipakai klub", event: "Dipakai event" };

const slotClass = (s: SlotState) =>
  clsx(
    "w-full rounded-lg px-2 py-2 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
    s === "free" && "border border-ok/80 bg-card hover:border-ok hover:bg-ok-soft",
    s === "selected" && "bg-integrity text-white",
    s !== "free" && s !== "selected" && "cursor-not-allowed bg-platinum text-muted-foreground",
  );

export function SlotPicker({ venue }: { venue: Venue }) {
  // Reads the clock and localStorage, so render only in the browser (wrapped in <Suspense> by the page).
  use(browser("Slot availability depends on the current time and saved bookings."));

  const now = new Date();
  const days = Array.from({ length: DAYS }, (_, k) => isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + k)));
  // "Pesan lagi" links here with ?date=&court=&tier= to preselect the day, court and tier.
  const params = useSearchParams();
  const wantCourt = params.get("court");
  const [date, setDate] = useState(() => (days.includes(params.get("date") ?? "") ? params.get("date")! : days[0]));
  const club = hasClub(venue);
  const [tier, setTier] = useState<Tier>(() => (club && params.get("tier") === "klub" ? "klub" : "perorangan"));
  const [sel, setSel] = useState<Sel>(null);
  // UI-04: court pills above the schedule. Phone shows that court's time grid; desktop highlights its table column.
  const [phoneCourt, setPhoneCourt] = useState(() => venue.courts.find((c) => c.id === wantCourt)?.id ?? venue.courts[0]?.id);
  const bookings = useBookings(); // active holds and paid bookings in this browser count as taken

  const visit = venue.block === "visit";
  const unit = unitLabel(venue);
  const len = blockLength(venue);
  const today = date === days[0];
  const allHours = blockHours(venue);
  // Today: hide blocks that already started instead of showing rows of "Lewat".
  const hours = today ? allHours.filter((h) => (visit ? now.getHours() < venue.close - 1 : h > now.getHours())) : allHours;
  const eventDay = isEventDay(venue.slug, date, bookings, now);
  const hasWeekend = venue.courts.some((c) => c.tariff.weekend);
  const hasPeak = venue.peakFrom != null;
  const status = (courtId: string, hour: number): SlotState => {
    if (eventDay) return "event";
    if (isSlotTaken(venue.slug, courtId, date, hour, bookings, now, len)) return club && tier === "perorangan" ? "club" : "booked";
    return sel?.courtId === courtId && sel.hour === hour ? "selected" : "free";
  };
  const court = venue.courts.find((c) => c.id === sel?.courtId);
  const price = (courtId: string, hour: number) => retailPrice(venue, venue.courts.find((c) => c.id === courtId)!, date, hour, tier);
  const href = sel && `/checkout?venue=${venue.slug}&court=${sel.courtId}&date=${date}&hour=${sel.hour}${club ? `&tier=${tier}` : ""}`;
  const toggle = (courtId: string, hour: number, s: SlotState) => setSel(s === "selected" ? null : { courtId, hour });
  // One unit: a grid of time buttons reads faster than a one-column table.
  const timeGrid = (courtId: string) => (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label={`Slot ${venue.courts.find((c) => c.id === courtId)?.name}`}>
      {hours.map((h) => {
        const s = status(courtId, h);
        return (
          <button
            key={h}
            type="button"
            disabled={s !== "free" && s !== "selected"}
            aria-pressed={s === "selected"}
            aria-label={`${hourLabel(h)}–${hourLabel(h + len)}, ${WORD[s]}`}
            onClick={() => toggle(courtId, h, s)}
            className={clsx(slotClass(s), "px-3 py-2.5")}
          >
            <span className="block text-sm font-semibold tabular-nums">{hourLabel(h)}–{hourLabel(h + len)}</span>
            <span className="block text-xs tabular-nums">{formatIDR(price(courtId, h))}</span>
            <span className="flex items-center justify-between gap-1">
              <span className={clsx("text-xs", s === "free" && "text-ok")}>{WORD[s]}</span>
              {hasPeak && <span className={clsx("text-xs", isPeak(venue, h) ? "font-semibold" : "", s === "selected" ? "text-white" : isPeak(venue, h) ? "text-primary" : "text-muted-foreground")}>{isPeak(venue, h) ? "Peak" : "Non-Peak"}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
  const peakTag = (h: number) =>
    hasPeak && <span className={clsx("block text-xs", isPeak(venue, h) ? "font-semibold text-primary" : "text-muted-foreground")}>{isPeak(venue, h) ? "Peak Hour" : "Non-Peak"}</span>;

  return (
    <Card className="gap-0 rounded-2xl p-5 ring-border sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-integrity">
        <CalendarDays className="size-5" aria-hidden /> Pilih jadwal
      </h2>

      {club && (
        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-medium">Jenis sewa</legend>
          <div className="grid grid-cols-2 gap-2">
            {TIERS.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={tier === t.id}
                onClick={() => { setTier(t.id); setSel(null); }}
                className={clsx(
                  "rounded-xl border px-3 py-2.5 text-left transition-colors",
                  tier === t.id ? "border-integrity bg-integrity text-white" : "border-line hover:border-integrity",
                )}
              >
                <span className="block text-sm font-semibold">{t.label}</span>
                <span className={clsx("block text-xs", tier === t.id ? "text-white/80" : "text-muted-foreground")}>{t.note}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="mt-5 min-w-0">
        <legend className="mb-2 text-sm font-medium">Tanggal</legend>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {days.map((d, k) => {
            const on = d === date;
            const wk = hasWeekend && isOffDay(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() => { setDate(d); setSel(null); }}
                className={clsx(
                  "min-w-[72px] shrink-0 rounded-xl border px-3 py-2 text-center transition-colors",
                  on ? "border-integrity bg-integrity text-white" : "border-line hover:border-integrity",
                )}
              >
                <span className="block text-xs opacity-80">{k === 0 ? "Hari ini" : formatDate(d, { weekday: "short" })}</span>
                <span className="block text-sm font-semibold">{formatDate(d, { day: "numeric", month: "short" })}</span>
                {wk && <span className={clsx("block text-xs font-medium", on ? "text-white/90" : "text-primary")}>{isHoliday(d) ? "Libur" : "Akhir pekan"}</span>}
              </button>
            );
          })}
        </div>
        {hasWeekend && <p className="mt-1 text-xs text-muted-foreground">Tarif akhir pekan berlaku Sabtu, Minggu, dan hari libur nasional.</p>}
      </fieldset>

      {eventDay && (
        <p className="mt-4 rounded-xl bg-secondary p-3 text-sm text-primary">Venue dipakai untuk event seharian pada tanggal ini. Pilih tanggal lain.</p>
      )}

      {visit ? (
        <section className="mt-6">
          <h3 className="text-sm font-medium">Tiket harian</h3>
          <p className="text-xs text-muted-foreground">Berlaku satu kali kedatangan, {hourLabel(venue.open)}–{hourLabel(venue.close)}.</p>
          {hours.length ? (
            <ul className="mt-3 grid gap-2">
              {venue.courts.map((c) => {
                const s = status(c.id, venue.open);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      disabled={s !== "free" && s !== "selected"}
                      aria-pressed={s === "selected"}
                      onClick={() => toggle(c.id, venue.open, s)}
                      className={clsx(slotClass(s), "flex items-center justify-between gap-3 px-4 py-3")}
                    >
                      <span>
                        <span className="block font-semibold">{c.name}</span>
                        <span className="block text-xs opacity-80">{c.surface}</span>
                      </span>
                      <span className="text-right">
                        <span className="block font-semibold tabular-nums">{formatIDR(price(c.id, venue.open))}</span>
                        <span className={clsx("block text-xs", s === "free" && "text-ok")}>{s === "free" ? "/ kedatangan" : WORD[s]}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">Tiket hari ini sudah tutup. Pilih tanggal lain.</p>
          )}
        </section>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium">Jadwal {unit.toLowerCase()}</h3>
              <p className="text-xs text-muted-foreground">
                Satu slot = {len} jam.{hasPeak && ` Peak Hour mulai ${hourLabel(venue.peakFrom!)}.`}
                {today && hours.length < allHours.length && " Jam yang sudah lewat tidak ditampilkan."}
              </p>
            </div>
            <ul className="flex gap-3 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5"><i className="size-3 rounded border border-ok bg-card" />Tersedia</li>
              <li className="flex items-center gap-1.5"><i className="size-3 rounded bg-integrity" />Dipilih</li>
              <li className="flex items-center gap-1.5"><i className="size-3 rounded bg-platinum ring-1 ring-line" />{club && tier === "perorangan" ? "Dipakai" : "Penuh"}</li>
            </ul>
          </div>

          {!hours.length ? (
            <p className="mt-3 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Jadwal hari ini sudah habis. Pilih tanggal lain.</p>
          ) : venue.courts.length === 1 ? (
            timeGrid(venue.courts[0].id)
          ) : (
            <>
              <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={`Pilih ${unit.toLowerCase()}`}>
                  {venue.courts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={c.id === phoneCourt}
                      onClick={() => { setPhoneCourt(c.id); document.getElementById(`col-${c.id}`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" }); }}
                      className={clsx(
                        "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                        c.id === phoneCourt ? "border-integrity bg-integrity text-white" : "border-line hover:border-integrity",
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
              </div>
              <div className="sm:hidden">{timeGrid(phoneCourt)}</div>
              <div className="hidden sm:block">
            <div className="mt-3 overflow-x-auto rounded-xl border border-line sm:max-h-[420px] sm:overflow-y-auto">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr>
                    <th scope="col" className="sticky left-0 z-10 w-24 border-b border-line bg-card px-2 py-3 text-xs font-medium text-muted-foreground">Jam</th>
                    {venue.courts.map((c) => (
                      <th key={c.id} id={`col-${c.id}`} scope="col" className={clsx("min-w-[128px] border-b border-l border-line px-2 py-3 text-center", c.id === phoneCourt && "bg-secondary")}>
                        <span className="block font-semibold text-integrity">{c.name}</span>
                        <span className="block text-xs font-normal text-muted-foreground">{c.surface}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hours.map((h) => (
                    <tr key={h}>
                      <th scope="row" className="sticky left-0 border-b border-line bg-card px-2 text-center text-xs font-medium tabular-nums text-muted-foreground">
                        {hourLabel(h)}–{hourLabel(h + len)}
                        {peakTag(h)}
                      </th>
                      {venue.courts.map((c) => {
                        const s = status(c.id, h);
                        return (
                          <td key={c.id} className={clsx("border-b border-l border-line p-1.5", c.id === phoneCourt && "bg-secondary/50")}>
                            <button
                              type="button"
                              disabled={s !== "free" && s !== "selected"}
                              aria-pressed={s === "selected"}
                              aria-label={`${c.name}, ${hourLabel(h)}–${hourLabel(h + len)}, ${WORD[s]}`}
                              onClick={() => toggle(c.id, h, s)}
                              className={slotClass(s)}
                            >
                              <span className="block text-xs font-semibold tabular-nums">{formatIDR(price(c.id, h))}</span>
                              <span className={clsx("block text-xs", s === "free" && "text-ok")}>{WORD[s]}</span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              </div>
            </>
          )}
        </>
      )}

      {sel && court && (
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl bg-integrity-soft p-4 text-sm">
          <dt className="text-muted-foreground">{unit}</dt><dd className="text-right font-medium">{court.name} · {court.surface}</dd>
          {club && (<><dt className="text-muted-foreground">Jenis sewa</dt><dd className="text-right font-medium">{tier === "klub" ? "Sewa Klub" : "Sewa Perorangan"}</dd></>)}
          <dt className="text-muted-foreground">Tanggal</dt><dd className="text-right font-medium">{formatDate(date)}</dd>
          <dt className="text-muted-foreground">Jam</dt><dd className="text-right font-medium tabular-nums">{hourLabel(sel.hour)}–{hourLabel(sel.hour + len)} ({visit ? "1 kedatangan" : `${len} jam`})</dd>
          <dt className="mt-2 border-t border-integrity/10 pt-2 font-semibold">Total</dt>
          <dd className="mt-2 border-t border-integrity/10 pt-2 text-right text-base font-bold text-integrity tabular-nums">{formatIDR(price(court.id, sel.hour))}</dd>
        </dl>
      )}

      <div className="hidden sm:block">
        {href ? (
          <Link href={href} className={buttonVariants({ variant: "cta", size: "lg", className: "mt-5 w-full" })}>Lanjut ke pembayaran</Link>
        ) : (
          <button type="button" disabled className={buttonVariants({ variant: "cta", size: "lg", className: "mt-5 w-full" })}>Pilih slot dulu</button>
        )}
      </div>

      <StickyBar>
        <p className="min-w-0 flex-1 text-sm">
          {sel && court ? (
            <>
              <span className="block truncate font-medium">{court.name} · {hourLabel(sel.hour)}–{hourLabel(sel.hour + len)}</span>
              <span className="block font-bold text-primary tabular-nums">{formatIDR(price(court.id, sel.hour))}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{visit ? "Pilih tiket" : `Pilih 1 slot ${len} jam`}</span>
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

export function SlotPickerSkeleton() {
  return <div className="h-[640px] animate-pulse rounded-2xl bg-muted" aria-label="Memuat jadwal" />;
}
