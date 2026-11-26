"use client";

// UI-08: Mezzanine rooms. Ruang A–C per hour on working days; Ruang D and Ruang Kelas 1–3 per whole day.
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { use, useState } from "react";
import { browser } from "react-dom";
import { DoorOpen, Minus, Plus } from "lucide-react";
import clsx from "clsx";
import { formatDate, formatIDR, hourLabel, isHoliday, isOffDay, isRoomTaken, isoDate, roomOpenOn, roomPrice } from "@/lib/booking";
import { useBookings } from "@/lib/useStore";
import type { Venue } from "@/lib/venues";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StickyBar } from "./StickyBar";

export const ROOM_DAYS = 14;
const MAX_HOURS = 8;

const pill = (on: boolean) =>
  clsx(
    "rounded-xl border text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
    on ? "border-integrity bg-integrity text-white" : "border-line hover:border-integrity",
  );

export function RoomPicker({ venue }: { venue: Venue }) {
  use(browser("Room availability depends on the current time and saved bookings."));
  const rooms = venue.rooms ?? [];
  const params = useSearchParams();
  const bookings = useBookings();
  const now = new Date();
  const days = Array.from({ length: ROOM_DAYS }, (_, k) => isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + k)));
  const [roomId, setRoomId] = useState(() => rooms.find((r) => r.id === params.get("room"))?.id ?? rooms[0]?.id);
  const room = rooms.find((r) => r.id === roomId)!;
  const firstOpen = (r = room) => days.find((d) => roomOpenOn(r, d)) ?? days[0];
  const [date, setDate] = useState(() => firstOpen());
  const [start, setStart] = useState<number | null>(null);
  const [hours, setHours] = useState(1);

  const perHour = room.unit === "jam";
  const today = date === days[0];
  const open = roomOpenOn(room, date);
  const dayLen = venue.close - venue.open;
  const hourList = Array.from({ length: dayLen }, (_, k) => venue.open + k);
  const hourFree = (h: number) => !(today && h <= now.getHours()) && !isRoomTaken(venue.slug, room, date, h, 1, bookings, now);
  // Longest run of free hours from the chosen start (stops at closing time or a taken hour).
  let maxHours = 0;
  if (start != null) while (maxHours < MAX_HOURS && start + maxHours < venue.close && hourFree(start + maxHours)) maxHours++;
  const len = perHour ? Math.min(hours, maxHours) : dayLen;
  const dayFree = !perHour && open && !(today && now.getHours() >= venue.open) && !isRoomTaken(venue.slug, room, date, venue.open, dayLen, bookings, now);
  const ready = perHour ? start != null && len > 0 : dayFree;
  const from = perHour ? start ?? venue.open : venue.open;
  const total = roomPrice(room, len);
  const href = ready ? `/checkout?venue=${venue.slug}&room=${room.id}&date=${date}&hour=${from}&hours=${len}` : null;

  const pickRoom = (id: string) => {
    const r = rooms.find((x) => x.id === id)!;
    setRoomId(id);
    setStart(null);
    setHours(1);
    if (!roomOpenOn(r, date)) setDate(firstOpen(r));
  };

  return (
    <Card className="gap-0 rounded-2xl p-5 ring-border sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-integrity">
        <DoorOpen className="size-5" aria-hidden /> Sewa ruangan
      </h2>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-medium">Pilih ruangan</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {rooms.map((r) => (
            <button key={r.id} type="button" aria-pressed={r.id === roomId} onClick={() => pickRoom(r.id)} className={clsx(pill(r.id === roomId), "p-3")}>
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{r.name}</span>
                <span className={clsx("text-xs", r.id === roomId ? "text-white/80" : "text-muted-foreground")}>{r.unit === "jam" ? "Per jam · hari kerja" : "Per hari"}</span>
              </span>
              <span className={clsx("block text-xs", r.id === roomId ? "text-white/80" : "text-muted-foreground")}>{r.area} m² · kapasitas {r.capacity} orang</span>
              <span className="mt-1 block text-sm font-semibold tabular-nums">{formatIDR(r.price)} <span className="font-normal opacity-80">/ {r.unit}</span></span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-5 min-w-0">
        <legend className="mb-2 text-sm font-medium">Tanggal</legend>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {days.map((d, k) => {
            const on = d === date;
            const closed = !roomOpenOn(room, d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                disabled={closed}
                title={closed ? "Ruangan per jam hanya disewakan pada hari kerja" : undefined}
                onClick={() => { setDate(d); setStart(null); }}
                className={clsx(
                  "min-w-[72px] shrink-0 rounded-xl border px-3 py-2 text-center outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                  on ? "border-integrity bg-integrity text-white" : closed ? "cursor-not-allowed border-line bg-platinum text-muted-foreground" : "border-line hover:border-integrity",
                )}
              >
                <span className="block text-xs opacity-80">{k === 0 ? "Hari ini" : formatDate(d, { weekday: "short" })}</span>
                <span className="block text-sm font-semibold">{formatDate(d, { day: "numeric", month: "short" })}</span>
                {isOffDay(d) && <span className="block text-xs">{isHoliday(d) ? "Libur" : "Akhir pekan"}</span>}
              </button>
            );
          })}
        </div>
        {perHour && <p className="mt-1 text-xs text-muted-foreground">Ruangan per jam hanya disewakan pada hari kerja (Senin–Jumat, bukan hari libur).</p>}
      </fieldset>

      {perHour ? (
        <section className="mt-6">
          <h3 className="text-sm font-medium">Jam mulai</h3>
          <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6" role="group" aria-label="Jam mulai">
            {hourList.map((h) => {
              const free = hourFree(h);
              const inRange = start != null && h >= start && h < start + len;
              return (
                <button
                  key={h}
                  type="button"
                  disabled={!free}
                  aria-pressed={h === start}
                  aria-label={`${hourLabel(h)}, ${free ? (inRange ? "dipilih" : "tersedia") : "terpakai"}`}
                  onClick={() => { setStart(h === start ? null : h); setHours(1); }}
                  className={clsx(
                    "rounded-lg py-2 text-sm font-semibold tabular-nums outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                    inRange ? "bg-integrity text-white" : free ? "border border-ok/80 bg-card hover:bg-ok-soft" : "cursor-not-allowed bg-platinum text-muted-foreground",
                  )}
                >
                  {hourLabel(h)}
                </button>
              );
            })}
          </div>
          {start != null && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border p-3">
              <span>
                <span className="block text-sm font-medium">Durasi</span>
                <span className="block text-xs text-muted-foreground">{maxHours < MAX_HOURS ? `Maksimal ${maxHours} jam dari ${hourLabel(start)}` : `Maksimal ${MAX_HOURS} jam`}</span>
              </span>
              <span className="flex items-center gap-2">
                <Button type="button" variant="outline" size="icon" aria-label="Kurangi durasi" disabled={len <= 1} onClick={() => setHours(len - 1)}><Minus aria-hidden /></Button>
                <span className="w-12 text-center font-semibold tabular-nums" aria-live="polite">{len} jam</span>
                <Button type="button" variant="outline" size="icon" aria-label="Tambah durasi" disabled={len >= maxHours} onClick={() => setHours(len + 1)}><Plus aria-hidden /></Button>
              </span>
            </div>
          )}
        </section>
      ) : (
        <p className={clsx("mt-6 rounded-xl p-4 text-sm", dayFree ? "bg-ok-soft text-ok" : "bg-platinum text-muted-foreground")}>
          {dayFree ? `Tersedia sehari penuh, ${hourLabel(venue.open)}–${hourLabel(venue.close)}.` : "Ruangan ini sudah terpakai pada tanggal tersebut. Pilih tanggal lain."}
        </p>
      )}

      {ready && (
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl bg-integrity-soft p-4 text-sm">
          <dt className="text-muted-foreground">Ruangan</dt><dd className="text-right font-medium">{room.name} · {room.area} m²</dd>
          <dt className="text-muted-foreground">Tanggal</dt><dd className="text-right font-medium">{formatDate(date)}</dd>
          <dt className="text-muted-foreground">Jam</dt><dd className="text-right font-medium tabular-nums">{hourLabel(from)}–{hourLabel(from + len)} ({perHour ? `${len} jam` : "sehari"})</dd>
          <hr className="col-span-2 my-1.5 border-integrity/10" />
          <dt className="font-semibold">Total</dt>
          <dd className="text-right text-base font-bold text-integrity tabular-nums">{formatIDR(total)}</dd>
        </dl>
      )}

      <div className="hidden sm:block">
        {href ? (
          <Link href={href} className={buttonVariants({ variant: "cta", size: "lg", className: "mt-5 w-full" })}>Lanjut ke pembayaran</Link>
        ) : (
          <button type="button" disabled className={buttonVariants({ variant: "cta", size: "lg", className: "mt-5 w-full" })}>{perHour ? "Pilih jam mulai dulu" : "Pilih tanggal lain"}</button>
        )}
      </div>

      <StickyBar>
        <p className="min-w-0 flex-1 text-sm">
          {ready ? (
            <>
              <span className="block truncate font-medium">{room.name} · {perHour ? `${len} jam` : "sehari"}</span>
              <span className="block font-bold text-primary tabular-nums">{formatIDR(total)}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{perHour ? "Pilih jam mulai" : "Pilih tanggal yang tersedia"}</span>
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
