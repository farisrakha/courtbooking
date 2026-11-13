"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { use } from "react";
import { browser } from "react-dom";
import { CalendarDays, CircleCheck, Clock, Download, MapPin, User } from "lucide-react";
import clsx from "clsx";
import { PAYMENT_METHODS, formatDate, formatIDR, hourLabel, isoDate, loadBookings, type Booking } from "@/lib/booking";
import { getVenue } from "@/lib/venues";
import { btn, card } from "./ui";

const where = (b: Booking) => {
  const v = getVenue(b.venueSlug);
  return { venue: v?.name ?? b.venueSlug, court: v?.courts.find((c) => c.id === b.courtId)?.name ?? b.courtId };
};

export function Confirmation() {
  use(browser("Bookings are stored in localStorage."));
  const { id } = useParams<{ id: string }>();
  const b = loadBookings().find((x) => x.id === id);

  if (!b) {
    return (
      <div className={`${card} p-8 text-center`}>
        <p className="text-lg font-semibold text-integrity">Booking tidak ditemukan</p>
        <p className="mt-2 text-sm text-muted">Booking disimpan di browser tempat kamu memesan.</p>
        <Link href="/bookings" className={clsx(btn("navy"), "mt-6")}>Lihat Booking Saya</Link>
      </div>
    );
  }
  const { venue, court } = where(b);
  const method = PAYMENT_METHODS.find((m) => m.id === b.method)?.label;

  return (
    <article className={`${card} overflow-hidden`}>
      <header className="bg-ok-soft px-6 py-8 text-center">
        <CircleCheck className="mx-auto size-14 text-ok" aria-hidden />
        <h1 className="mt-3 text-2xl font-bold text-integrity">Booking berhasil!</h1>
        <p className="mt-1 text-sm text-ok">Lapanganmu sudah dipesan.</p>
      </header>
      <div className="space-y-6 p-6">
        <div className="rounded-xl bg-platinum p-4 text-center">
          <p className="text-xs text-muted">Kode booking</p>
          <p className="mt-1 font-mono text-xl font-bold tracking-wider text-integrity">{b.id}</p>
        </div>

        <section>
          <h2 className="font-semibold">Detail booking</h2>
          <ul className="mt-3 space-y-3 text-sm">
            <li className="flex gap-3"><MapPin className="size-5 shrink-0 text-integrity" aria-hidden /><span><b className="block font-medium">{venue}</b><span className="text-muted">{court}</span></span></li>
            <li className="flex gap-3"><CalendarDays className="size-5 shrink-0 text-integrity" aria-hidden />{formatDate(b.date)}</li>
            <li className="flex gap-3"><Clock className="size-5 shrink-0 text-integrity" aria-hidden /><span><b className="block font-medium tabular-nums">{hourLabel(b.hour)}–{hourLabel(b.hour + 1)}</b><span className="text-muted">Durasi 1 jam</span></span></li>
            <li className="flex gap-3"><User className="size-5 shrink-0 text-integrity" aria-hidden /><span><b className="block font-medium">{b.name}{b.team ? ` · ${b.team}` : ""}</b><span className="text-muted">{b.email} · {b.phone}</span></span></li>
          </ul>
        </section>

        <section className="border-t border-line pt-5">
          <h2 className="font-semibold">Pembayaran</h2>
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1.5 text-sm tabular-nums">
            <dt className="text-muted">Harga sewa</dt><dd>{formatIDR(b.subtotal)}</dd>
            <dt className="text-muted">Biaya pembayaran ({method})</dt><dd>{formatIDR(b.fee)}</dd>
            {b.discount > 0 && (<><dt className="text-ok">Diskon {b.voucher}</dt><dd className="text-ok">−{formatIDR(b.discount)}</dd></>)}
            <dt className="mt-2 border-t border-line pt-2 font-semibold">Total dibayar</dt>
            <dd className="mt-2 border-t border-line pt-2 text-lg font-bold text-integrity">{formatIDR(b.total)}</dd>
          </dl>
        </section>

        <section className="rounded-xl bg-integrity-soft p-4 text-sm">
          <h2 className="font-semibold text-integrity">Penting</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink/80">
            <li>Datang 15 menit sebelum jadwal.</li>
            <li>Tunjukkan kode booking dan kartu identitas di meja venue.</li>
            <li>Pembatalan paling lambat 2 jam sebelum jadwal.</li>
          </ul>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 print:hidden">
          <button type="button" onClick={() => window.print()} className={btn("outline", "lg")}><Download className="size-4" aria-hidden />Unduh bukti</button>
          <Link href="/#venue" className={btn("primary", "lg")}>Booking venue lain</Link>
        </div>
      </div>
    </article>
  );
}

export function BookingList() {
  use(browser("Bookings are stored in localStorage."));
  const today = isoDate(new Date());
  const all = loadBookings().sort((a, b) => (a.date + a.hour).localeCompare(b.date + b.hour));
  const upcoming = all.filter((b) => b.date >= today);
  const past = all.filter((b) => b.date < today).reverse();
  const groups: [string, Booking[]][] = [["Akan datang", upcoming], ["Selesai", past]];

  if (!all.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-10 text-center">
        <p className="font-medium">Belum ada booking.</p>
        <p className="mt-1 text-sm text-muted">Booking yang kamu buat di browser ini akan muncul di sini.</p>
        <Link href="/#venue" className={clsx(btn("primary"), "mt-6")}>Cari lapangan</Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {groups.map(([title, list]) =>
        list.length ? (
          <section key={title}>
            <h2 className="text-lg font-semibold text-integrity">{title}</h2>
            <ul className="mt-3 space-y-3">
              {list.map((b) => {
                const { venue, court } = where(b);
                return (
                  <li key={b.id}>
                    <Link href={`/booking/${b.id}`} className={`${card} flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-integrity`}>
                      <span>
                        <span className="block font-semibold text-integrity">{venue}</span>
                        <span className="block text-sm text-muted">{court} · {formatDate(b.date, { weekday: "short", day: "numeric", month: "short" })} · <span className="tabular-nums">{hourLabel(b.hour)}–{hourLabel(b.hour + 1)}</span></span>
                      </span>
                      <span className="text-right">
                        <span className="block font-mono text-xs text-muted">{b.id}</span>
                        <span className="block font-semibold tabular-nums">{formatIDR(b.total)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null,
      )}
    </div>
  );
}
