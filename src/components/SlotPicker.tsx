"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { use, useState } from "react";
import { browser } from "react-dom";
import { CalendarDays } from "lucide-react";
import clsx from "clsx";
import { formatDate, formatIDR, hourLabel, isSlotTaken, isoDate } from "@/lib/booking";
import { useBookings } from "@/lib/useStore";
import type { Venue } from "@/lib/venues";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const DAYS = 7;

type Sel = { courtId: string; hour: number } | null;

export function SlotPicker({ venue }: { venue: Venue }) {
  // Reads the clock and localStorage, so render only in the browser (wrapped in <Suspense> by the page).
  use(browser("Slot availability depends on the current time and saved bookings."));

  const now = new Date();
  const days = Array.from({ length: DAYS }, (_, k) => isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + k)));
  // "Pesan lagi" links here with ?date=&court= to preselect the day and highlight the court.
  const params = useSearchParams();
  const wantCourt = params.get("court");
  const [date, setDate] = useState(() => (days.includes(params.get("date") ?? "") ? params.get("date")! : days[0]));
  const [sel, setSel] = useState<Sel>(null);
  const bookings = useBookings(); // active holds and paid bookings in this browser count as taken

  const hours = Array.from({ length: venue.close - venue.open }, (_, k) => venue.open + k);
  const status = (courtId: string, hour: number) => {
    if (date === days[0] && hour <= now.getHours()) return "past";
    if (isSlotTaken(venue.slug, courtId, date, hour, bookings, now)) return "booked";
    return sel?.courtId === courtId && sel.hour === hour ? "selected" : "free";
  };
  const court = venue.courts.find((c) => c.id === sel?.courtId);

  return (
    <Card className="gap-0 rounded-2xl p-5 ring-border sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-integrity">
        <CalendarDays className="size-5" aria-hidden /> Pilih jadwal
      </h2>

      <fieldset className="mt-5 min-w-0">
        <legend className="mb-2 text-sm font-medium">Tanggal</legend>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {days.map((d, k) => (
            <button
              key={d}
              type="button"
              aria-pressed={d === date}
              onClick={() => { setDate(d); setSel(null); }}
              className={clsx(
                "min-w-[68px] shrink-0 rounded-xl border px-3 py-2 text-center transition-colors",
                d === date ? "border-integrity bg-integrity text-white" : "border-line hover:border-integrity",
              )}
            >
              <span className="block text-xs opacity-80">{k === 0 ? "Hari ini" : formatDate(d, { weekday: "short" })}</span>
              <span className="block text-sm font-semibold">{formatDate(d, { day: "numeric", month: "short" })}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">Jadwal lapangan</h3>
          <p className="text-xs text-muted-foreground">Pilih satu slot 1 jam yang tersedia.</p>
        </div>
        <ul className="flex gap-3 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5"><i className="size-3 rounded border border-ok bg-white" />Tersedia</li>
          <li className="flex items-center gap-1.5"><i className="size-3 rounded bg-integrity" />Dipilih</li>
          <li className="flex items-center gap-1.5"><i className="size-3 rounded bg-platinum ring-1 ring-line" />Penuh</li>
        </ul>
      </div>

      <div className="mt-3 max-h-[420px] overflow-auto rounded-xl border border-line">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              <th scope="col" className="sticky left-0 z-10 w-16 border-b border-line bg-white px-2 py-3 text-xs font-medium text-muted-foreground">Jam</th>
              {venue.courts.map((c) => (
                <th key={c.id} scope="col" className={clsx("min-w-[128px] border-b border-l border-line px-2 py-3 text-center", c.id === wantCourt && "bg-secondary")}>
                  <span className="block font-semibold text-integrity">{c.name}</span>
                  <span className="block text-xs font-normal text-muted-foreground">{c.surface}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((h) => (
              <tr key={h}>
                <th scope="row" className="sticky left-0 border-b border-line bg-white px-2 text-center text-xs font-medium tabular-nums text-muted-foreground">{hourLabel(h)}</th>
                {venue.courts.map((c) => {
                  const s = status(c.id, h);
                  const disabled = s === "past" || s === "booked";
                  return (
                    <td key={c.id} className="border-b border-l border-line p-1.5">
                      <button
                        type="button"
                        disabled={disabled}
                        aria-pressed={s === "selected"}
                        aria-label={`${c.name}, ${hourLabel(h)}, ${s === "free" ? "tersedia" : s === "selected" ? "dipilih" : "tidak tersedia"}`}
                        onClick={() => setSel(s === "selected" ? null : { courtId: c.id, hour: h })}
                        className={clsx(
                          "w-full rounded-lg px-2 py-2 text-left transition-colors",
                          s === "free" && "border border-ok/40 bg-white hover:border-ok hover:bg-ok-soft",
                          s === "selected" && "bg-integrity text-white",
                          disabled && "cursor-not-allowed bg-platinum text-muted-foreground/70",
                        )}
                      >
                        <span className="block text-xs font-semibold tabular-nums">{formatIDR(c.price)}</span>
                        <span className={clsx("block text-[11px]", s === "free" && "text-ok")}>
                          {s === "free" ? "Tersedia" : s === "selected" ? "Dipilih" : s === "past" ? "Lewat" : "Penuh"}
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sel && court && (
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl bg-integrity-soft p-4 text-sm">
          <dt className="text-muted-foreground">Lapangan</dt><dd className="text-right font-medium">{court.name} · {court.surface}</dd>
          <dt className="text-muted-foreground">Tanggal</dt><dd className="text-right font-medium">{formatDate(date)}</dd>
          <dt className="text-muted-foreground">Jam</dt><dd className="text-right font-medium tabular-nums">{hourLabel(sel.hour)}–{hourLabel(sel.hour + 1)}</dd>
          <dt className="mt-2 border-t border-integrity/10 pt-2 font-semibold">Total</dt>
          <dd className="mt-2 border-t border-integrity/10 pt-2 text-right text-base font-bold text-integrity tabular-nums">{formatIDR(court.price)}</dd>
        </dl>
      )}

      {sel ? (
        <Link
          href={`/checkout?venue=${venue.slug}&court=${sel.courtId}&date=${date}&hour=${sel.hour}`}
          className={buttonVariants({ variant: "cta", size: "lg", className: "mt-5 w-full" })}
        >
          Lanjut ke pembayaran
        </Link>
      ) : (
        <button type="button" disabled className={buttonVariants({ variant: "cta", size: "lg", className: "mt-5 w-full" })}>Pilih slot dulu</button>
      )}
    </Card>
  );
}

export function SlotPickerSkeleton() {
  return <div className="h-[640px] animate-pulse rounded-2xl bg-muted" aria-label="Memuat jadwal" />;
}
