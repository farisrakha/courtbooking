"use client";

import Image from "next/image";
import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import clsx from "clsx";
import { LOCATIONS, SPORTS, VENUES } from "@/lib/venues";
import { VenueCard } from "./VenueCard";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const SPORT_IMAGE: Record<string, string> = {
  Tenis: "/images/venues/tennis_01.webp",
  "Bulu Tangkis": "/images/venues/badminton_01.webp",
  "Futsal & Basket": "/images/venues/gor_01.webp",
  "Mini Soccer": "/images/venues/field_01.webp",
};

const field = "h-11 rounded-xl bg-muted pl-9 focus-visible:bg-background";

// ponytail: filters live in component state, not the URL. Move to searchParams if people need to share filtered links.
export function VenueBrowser() {
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const [sport, setSport] = useState("");

  const needle = q.trim().toLowerCase();
  const list = VENUES.filter(
    (v) =>
      (!loc || v.location === loc) &&
      (!sport || v.sport === sport) &&
      (!needle || `${v.name} ${v.sport} ${v.location} ${v.address}`.toLowerCase().includes(needle)),
  );
  const reset = () => { setQ(""); setLoc(""); setSport(""); };
  const toVenues = () => document.getElementById("venue")?.scrollIntoView();

  return (
    <>
      <form
        role="search"
        onSubmit={(e) => { e.preventDefault(); toVenues(); }}
        className="relative z-10 mx-auto -mt-16 max-w-4xl rounded-2xl border bg-card p-3 shadow-xl shadow-integrity/10 sm:p-4"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Cari venue</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari venue, olahraga, atau lokasi…" className={field} />
          </label>
          <label className="relative sm:w-48">
            <span className="sr-only">Lokasi</span>
            <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            {/* ponytail: native select, styled like Input. shadcn Select when we need custom option rendering. */}
            <select
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
              className={clsx(field, "w-full appearance-none border border-input pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50")}
            >
              <option value="">Semua lokasi</option>
              {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </label>
          <button type="submit" className={buttonVariants({ variant: "cta", className: "h-11" })}>Cari</button>
        </div>
      </form>

      <section aria-labelledby="sport-title" className="mx-auto max-w-6xl px-4 pt-14">
        <h2 id="sport-title" className="text-2xl font-bold text-primary sm:text-3xl">Mau main apa hari ini?</h2>
        <p className="mt-1 text-sm text-muted-foreground">Pilih olahraga untuk melihat venue yang tersedia.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" role="group" aria-label="Filter olahraga">
          {SPORTS.map((s) => {
            const venues = VENUES.filter((v) => v.sport === s);
            const soon = venues.every((v) => v.comingSoon);
            const on = sport === s;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => { setSport(on ? "" : s); toVenues(); }}
                className={clsx(
                  "group relative isolate flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl p-3 text-left text-white outline-none transition-shadow focus-visible:ring-3 focus-visible:ring-ring/50 sm:aspect-[5/4] sm:p-4",
                  on && "ring-3 ring-victory ring-offset-2",
                )}
              >
                <Image src={SPORT_IMAGE[s]} alt="" fill sizes="(min-width: 1024px) 270px, 50vw" className="-z-10 object-cover transition-transform duration-500 group-hover:scale-105" />
                <span className="absolute inset-0 -z-10 bg-gradient-to-t from-integrity-deep/90 via-integrity-deep/30 to-transparent" aria-hidden />
                {soon && <Badge className="absolute right-2.5 top-2.5 bg-background text-victory">Segera hadir</Badge>}
                <span className="text-base font-semibold leading-tight sm:text-lg">{s}</span>
                <span className="mt-0.5 text-xs text-white/80">{soon ? "Belum bisa dipesan" : `${venues.length} venue`}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section id="venue" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-primary sm:text-3xl">Venue tersedia</h2>
            <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
              {list.length} venue ditemukan{sport && ` untuk ${sport}`}
            </p>
          </div>
          {(sport || loc || needle) && (
            <button type="button" onClick={reset} className={buttonVariants({ variant: "ghost" })}>Tampilkan semua</button>
          )}
        </div>
        {list.length ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((v) => <VenueCard key={v.slug} v={v} />)}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed p-10 text-center">
            <p className="font-medium">Tidak ada venue yang cocok.</p>
            <button type="button" onClick={reset} className={buttonVariants({ variant: "outline", className: "mt-4" })}>Hapus filter</button>
          </div>
        )}
      </section>
    </>
  );
}
