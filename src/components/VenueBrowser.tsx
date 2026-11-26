"use client";

import Image from "next/image";
import { useState } from "react";
import { Building2, MapPin, Search } from "lucide-react";
import clsx from "clsx";
import { LOCATIONS, SPORTS, VENUES, rentalTypes, type RentalType } from "@/lib/venues";
import { VenueCard } from "./VenueCard";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SPORT_IMAGE: Record<string, string> = {
  Tenis: "/images/venues/tennis_01.webp",
  "Bulu Tangkis": "/images/venues/badminton_01.webp",
  "Futsal & Basket": "/images/venues/gor_01.webp",
  Aquatic: "/images/venues/aquatic_01.webp",
  Panahan: "/images/venues/archery_01.webp",
  "Panjat Tebing": "/images/venues/climb_01.webp",
  "Mini Soccer": "/images/venues/field_01.webp",
};

// UI-02: categories for the "Sewa Event, Tribun & Ruangan" tab.
const TYPE_CARDS: { type: RentalType; title: string; img: string }[] = [
  { type: "Event", title: "Venue Event & Kompetisi", img: "/images/venues/gor_03.webp" },
  { type: "Tribun", title: "Tribun Penonton / Ujian", img: "/images/venues/gor_02.webp" },
  { type: "Ruangan", title: "Ruangan Mezzanine", img: "/images/venues/area_01.webp" },
];

type Mode = "retail" | "event";
const inMode = (mode: Mode, types: RentalType[]) => (mode === "retail" ? types.includes("Retail") : types.some((t) => t !== "Retail"));

const field = "h-11 rounded-xl bg-muted pl-9 focus-visible:bg-background";

// ponytail: filters live in component state, not the URL. Move to searchParams if people need to share filtered links.
export function VenueBrowser() {
  const [mode, setMode] = useState<Mode>("retail");
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const [sport, setSport] = useState(""); // retail tab: sport; event tab: rental type

  const needle = q.trim().toLowerCase();
  const list = VENUES.filter((v) => {
    const types = rentalTypes(v);
    return (
      inMode(mode, types) &&
      (!loc || v.location === loc) &&
      (!sport || (mode === "retail" ? v.sport === sport : types.includes(sport as RentalType))) &&
      (!needle || `${v.name} ${v.sport ?? ""} ${types.join(" ")} ${v.location} ${v.address}`.toLowerCase().includes(needle))
    );
  });
  const reset = () => { setQ(""); setLoc(""); setSport(""); };
  const cards =
    mode === "retail"
      ? SPORTS.map((s) => ({ key: s, title: s, img: SPORT_IMAGE[s], venues: VENUES.filter((v) => v.sport === s) }))
      : TYPE_CARDS.map((c) => ({ key: c.type, title: c.title, img: c.img, venues: VENUES.filter((v) => rentalTypes(v).includes(c.type)) }));
  const select = clsx(field, "w-full appearance-none border border-input pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50");
  const toVenues = () => document.getElementById("venue")?.scrollIntoView();

  return (
    <>
      <form
        role="search"
        onSubmit={(e) => { e.preventDefault(); toVenues(); }}
        className="relative z-10 mx-auto -mt-16 max-w-4xl rounded-2xl border bg-card p-3 shadow-xl shadow-integrity/10 sm:p-4"
      >
        {/* UI-01: separate players from event organizers up front. */}
        <Tabs value={mode} onValueChange={(m) => { setMode(m as Mode); setSport(""); }} className="mb-3">
          <TabsList className="h-11 w-full sm:w-fit">
            <TabsTrigger value="retail" className="px-3">Sewa Lapangan</TabsTrigger>
            <TabsTrigger value="event" className="px-3">
              <span className="sm:hidden">Event & Ruangan</span>
              <span className="hidden sm:inline">Sewa Event, Tribun & Ruangan</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Cari venue</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={mode === "retail" ? "Cari venue, olahraga, atau lokasi…" : "Cari venue atau ruangan…"} className={field} />
          </label>
          {mode === "event" && (
            <label className="relative sm:w-48">
              <span className="sr-only">Tipe penyewaan</span>
              <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <select value={sport} onChange={(e) => setSport(e.target.value)} className={select}>
                <option value="">Semua tipe sewa</option>
                {TYPE_CARDS.map((c) => <option key={c.type} value={c.type}>{c.type}</option>)}
              </select>
            </label>
          )}
          <label className="relative sm:w-48">
            <span className="sr-only">Kawasan</span>
            <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            {/* ponytail: native select, styled like Input. shadcn Select when we need custom option rendering. */}
            <select value={loc} onChange={(e) => setLoc(e.target.value)} className={select}>
              <option value="">Semua kawasan</option>
              {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </label>
          <button type="submit" className={buttonVariants({ variant: "cta", className: "h-11" })}>Cari</button>
        </div>
      </form>

      <section aria-labelledby="sport-title" className="mx-auto max-w-6xl px-4 pt-14">
        <h2 id="sport-title" className="text-2xl font-bold text-primary sm:text-3xl">{mode === "retail" ? "Mau main apa hari ini?" : "Mau gelar acara apa?"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "retail" ? "Pilih olahraga untuk melihat venue yang tersedia." : "Sewa venue seharian untuk kejuaraan, tribun untuk penonton atau ujian, atau ruangan untuk kegiatan."}
        </p>
        <div className={clsx("mt-6 grid grid-cols-2 gap-3 sm:gap-4", mode === "retail" ? "lg:grid-cols-4" : "sm:grid-cols-3")} role="group" aria-label={mode === "retail" ? "Filter olahraga" : "Filter tipe penyewaan"}>
          {cards.map(({ key: s, title, img, venues }) => {
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
                  on && "ring-3 ring-integrity ring-offset-2",
                )}
              >
                <Image src={img} alt="" fill sizes="(min-width: 1024px) 270px, 50vw" className="-z-10 object-cover transition-transform duration-500 group-hover:scale-105" />
                <span className="absolute inset-0 -z-10 bg-gradient-to-t from-integrity-deep/90 via-integrity-deep/30 to-transparent" aria-hidden />
                {soon && <Badge className="absolute right-2.5 top-2.5 bg-background text-primary">Segera hadir</Badge>}
                <span className="text-base font-semibold leading-tight sm:text-lg">{title}</span>
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
              {list.length} venue ditemukan{sport && ` untuk ${mode === "retail" ? sport : `sewa ${sport}`}`}
            </p>
          </div>
          {(sport || loc || needle) && (
            <button type="button" onClick={reset} className={buttonVariants({ variant: "ghost" })}>Tampilkan semua</button>
          )}
        </div>
        {list.length ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((v) => <VenueCard key={v.slug} v={v} mode={mode} />)}
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
