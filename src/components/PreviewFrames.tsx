"use client";

import { useState } from "react";
import { ExternalLink, Monitor, RotateCw, Smartphone } from "lucide-react";
import clsx from "clsx";
import { isBookedByOthers, isoDate } from "@/lib/booking";

/** First free slot tomorrow at Bulu Tangkis Senayan, so the checkout preview always has a valid slot. */
function checkoutPath() {
  const d = new Date();
  const date = isoDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
  const hour = [18, 19, 20, 17, 16, 15, 14, 9, 10].find((h) => !isBookedByOthers("bulu-tangkis-senayan", "b1", date, h)) ?? 18;
  return `/checkout?venue=bulu-tangkis-senayan&court=b1&date=${date}&hour=${hour}`;
}

const PAGES: { label: string; path: string | (() => string) }[] = [
  { label: "Beranda", path: "/" },
  { label: "Daftar", path: "/daftar" },
  { label: "Masuk", path: "/masuk" },
  { label: "Login gate", path: () => `/masuk?next=${encodeURIComponent(checkoutPath())}` },
  { label: "Verifikasi email", path: "/verifikasi-email" },
  { label: "Lupa sandi", path: "/lupa-sandi" },
  { label: "Detail venue", path: "/venue/bulu-tangkis-senayan" },
  { label: "Pembayaran", path: checkoutPath },
  { label: "Booking Saya", path: "/bookings" },
  { label: "Profil", path: "/profil" },
];

export function PreviewFrames() {
  const [path, setPath] = useState("/");
  const [active, setActive] = useState("Beranda");
  const [reload, setReload] = useState(0);

  return (
    <>
      <header className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-primary">Preview</h1>
          <p className="text-sm text-muted-foreground">Both frames share this browser&apos;s demo login and bookings. Pages that need a booking: open one from Booking Saya inside a frame.</p>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium text-primary">
          <button type="button" onClick={() => setReload((n) => n + 1)} className="inline-flex items-center gap-1.5 hover:underline"><RotateCw className="size-4" aria-hidden />Muat ulang</button>
          <a href={path} target="_blank" className="inline-flex items-center gap-1.5 hover:underline">Buka di tab baru <ExternalLink className="size-4" aria-hidden /></a>
        </div>
      </header>

      <nav aria-label="Pilih halaman" className="mx-auto mt-4 flex max-w-[1200px] flex-wrap gap-2">
        {PAGES.map((p) => (
          <button
            key={p.label}
            type="button"
            aria-pressed={active === p.label}
            onClick={() => { setActive(p.label); setPath(typeof p.path === "string" ? p.path : p.path()); }}
            className={clsx(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              active === p.label ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-primary",
            )}
          >
            {p.label}
          </button>
        ))}
      </nav>

      <div className="mx-auto mt-6 flex max-w-[1200px] items-start gap-8 overflow-x-auto pb-4">
        <figure className="shrink-0">
          <figcaption className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
            <Monitor className="size-4" aria-hidden /> Desktop <span className="font-normal text-muted-foreground">1440 × 1600</span>
          </figcaption>
          <div className="h-[800px] w-[720px] overflow-hidden rounded-xl bg-background shadow-xl ring-1 ring-border">
            <iframe key={`d${path}${reload}`} src={path} title="Pratinjau desktop" className="h-[1600px] w-[1440px] origin-top-left scale-50" />
          </div>
        </figure>
        <figure className="shrink-0">
          <figcaption className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
            <Smartphone className="size-4" aria-hidden /> Mobile <span className="font-normal text-muted-foreground">375 × 812</span>
          </figcaption>
          <div className="rounded-[2.75rem] bg-integrity-deep p-3 shadow-xl">
            <iframe key={`m${path}${reload}`} src={path} title="Pratinjau mobile" className="h-[812px] w-[375px] rounded-[2rem] bg-background" />
          </div>
        </figure>
      </div>
    </>
  );
}
