"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import { browser } from "react-dom";
import { CalendarDays } from "lucide-react";
import clsx from "clsx";
import { formatDate, formatIDR, hourLabel, isBookedByOthers, isoDate, loadBookings, slotKey } from "@/lib/booking";
import type { Venue } from "@/lib/venues";
import { btn, card } from "./ui";

const DAYS = 7;

type Sel = { courtId: string; hour: number } | null;

export function SlotPicker({ venue }: { venue: Venue }) {
  // Reads the clock and localStorage, so render only in the browser (wrapped in <Suspense> by the page).
  use(browser("Slot availability depends on the current time and saved bookings."));

  const now = new Date();
  const days = Array.from({ length: DAYS }, (_, k) => isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + k)));
  const [date, setDate] = useState(days[0]);
  const [sel, setSel] = useState<Sel>(null);
  const mine = useMemo(() => new Set(loadBookings().map((b) => slotKey(b.venueSlug, b.courtId, b.date, b.hour))), []);

  const hours = Array.from({ length: venue.close - venue.open }, (_, k) => venue.open + k);
  const status = (courtId: string, hour: number) => {
    if (date === days[0] && hour <= now.getHours()) return "past";
    if (mine.has(slotKey(venue.slug, courtId, date, hour)) || isBookedByOthers(venue.slug, courtId, date, hour)) return "booked";
    return sel?.courtId === courtId && sel.hour === hour ? "selected" : "free";
  };
  const court = venue.courts.find((c) => c.id === sel?.courtId);

  return (
    <div className={`${card} p-5 sm:p-6`}>
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
          <p className="text-xs text-muted">Pilih satu slot 1 jam yang tersedia.</p>
        </div>
        <ul className="flex gap-3 text-xs text-muted">
          <li className="flex items-center gap-1.5"><i className="size-3 rounded border border-ok bg-white" />Tersedia</li>
          <li className="flex items-center gap-1.5"><i className="size-3 rounded bg-integrity" />Dipilih</li>
          <li className="flex items-center gap-1.5"><i className="size-3 rounded bg-platinum ring-1 ring-line" />Penuh</li>
        </ul>
      </div>

      <div className="mt-3 max-h-[420px] overflow-auto rounded-xl border border-line">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              <th scope="col" className="sticky left-0 z-10 w-16 border-b border-line bg-white px-2 py-3 text-xs font-medium text-muted">Jam</th>
              {venue.courts.map((c) => (
                <th key={c.id} scope="col" className="min-w-[128px] border-b border-l border-line px-2 py-3 text-center">
                  <span className="block font-semibold text-integrity">{c.name}</span>
                  <span className="block text-xs font-normal text-muted">{c.surface}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((h) => (
              <tr key={h}>
                <th scope="row" className="sticky left-0 border-b border-line bg-white px-2 text-center text-xs font-medium tabular-nums text-muted">{hourLabel(h)}</th>
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
                          disabled && "cursor-not-allowed bg-platinum text-muted/70",
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
          <dt className="text-muted">Lapangan</dt><dd className="text-right font-medium">{court.name} · {court.surface}</dd>
          <dt className="text-muted">Tanggal</dt><dd className="text-right font-medium">{formatDate(date)}</dd>
          <dt className="text-muted">Jam</dt><dd className="text-right font-medium tabular-nums">{hourLabel(sel.hour)}–{hourLabel(sel.hour + 1)}</dd>
          <dt className="mt-2 border-t border-integrity/10 pt-2 font-semibold">Total</dt>
          <dd className="mt-2 border-t border-integrity/10 pt-2 text-right text-base font-bold text-integrity tabular-nums">{formatIDR(court.price)}</dd>
        </dl>
      )}

      {sel ? (
        <Link
          href={`/checkout?venue=${venue.slug}&court=${sel.courtId}&date=${date}&hour=${sel.hour}`}
          className={clsx(btn("primary", "lg"), "mt-5 w-full")}
        >
          Lanjut ke pembayaran
        </Link>
      ) : (
        <button type="button" disabled className={clsx(btn("primary", "lg"), "mt-5 w-full")}>Pilih slot dulu</button>
      )}
    </div>
  );
}

export function SlotPickerSkeleton() {
  return <div className={`${card} h-[640px] animate-pulse bg-platinum`} aria-label="Memuat jadwal" />;
}
