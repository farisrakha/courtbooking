"use client";

import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import clsx from "clsx";
import { LOCATIONS, SPORTS, VENUES } from "@/lib/venues";
import { VenueCard } from "./VenueCard";
import { btn, input } from "./ui";

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

  return (
    <>
      <form
        role="search"
        onSubmit={(e) => { e.preventDefault(); document.getElementById("venue")?.scrollIntoView(); }}
        className="relative z-10 mx-auto -mt-16 max-w-4xl rounded-2xl border border-line bg-white p-3 shadow-xl shadow-integrity/10 sm:p-4"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Cari venue</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari venue, olahraga, atau lokasi…" className={clsx(input, "pl-9")} />
          </label>
          <label className="relative sm:w-48">
            <span className="sr-only">Lokasi</span>
            <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <select value={loc} onChange={(e) => setLoc(e.target.value)} className={clsx(input, "appearance-none pl-9")}>
              <option value="">Semua lokasi</option>
              {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </label>
          <button type="submit" className={clsx(btn("primary"), "h-11")}>Cari</button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Filter olahraga">
          {["", ...SPORTS].map((s) => (
            <button
              key={s || "all"}
              type="button"
              aria-pressed={sport === s}
              onClick={() => setSport(s)}
              className={clsx(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                sport === s ? "border-integrity bg-integrity text-white" : "border-line text-ink hover:border-integrity",
              )}
            >
              {s || "Semua olahraga"}
            </button>
          ))}
        </div>
      </form>

      <section id="venue" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-14">
        <h2 className="text-2xl font-bold text-integrity sm:text-3xl">Venue tersedia</h2>
        <p className="mt-1 text-sm text-muted" aria-live="polite">{list.length} venue ditemukan</p>
        {list.length ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((v) => <VenueCard key={v.slug} v={v} />)}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-line p-10 text-center">
            <p className="font-medium">Tidak ada venue yang cocok.</p>
            <button type="button" onClick={reset} className={clsx(btn("outline"), "mt-4")}>Hapus filter</button>
          </div>
        )}
      </section>
    </>
  );
}
