"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { eyebrow } from "./ui";

const SLIDES = [
  { sport: "Tenis", title: "Servis terbaikmu dimulai di sini.", sub: "Lapangan hard court dan clay di jantung Senayan.", img: "/images/venues/tennis_02.webp" },
  { sport: "Bulu Tangkis", title: "Kuasai setiap rally.", sub: "Hall indoor berkarpet vinyl, buka dari pagi sampai malam.", img: "/images/venues/badminton_02.webp" },
  { sport: "Futsal & Basket", title: "Satu arena, banyak permainan.", sub: "GOR POPKI Cibubur untuk latihan tim dan turnamen.", img: "/images/venues/gor_02.webp" },
];

export function HeroCarousel() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const go = (d: number) => setI((n) => (n + d + SLIDES.length) % SLIDES.length);

  useEffect(() => {
    if (paused || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % SLIDES.length), 7000);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Olahraga unggulan"
      className="relative isolate h-[440px] overflow-hidden bg-integrity-deep sm:h-[500px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {SLIDES.map((s, k) => (
        <Image
          key={s.img}
          src={s.img}
          alt=""
          fill
          sizes="100vw"
          priority={k === 0}
          className={clsx("-z-10 object-cover transition-opacity duration-700", k === i ? "opacity-100" : "opacity-0")}
        />
      ))}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-integrity-deep/90 via-integrity-deep/60 to-integrity-deep/20" />

      <div className="mx-auto flex h-full max-w-6xl items-center px-4 pb-16">
        <div className="max-w-xl text-white" aria-live="polite">
          <p className={clsx(eyebrow, "flex items-center gap-3 text-white/80")}>
            <span className="h-px w-8 bg-victory" aria-hidden />
            {SLIDES[i].sport}
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-balance sm:text-6xl">{SLIDES[i].title}</h1>
          <p className="mt-4 text-base text-white/85 sm:text-lg">{SLIDES[i].sub}</p>

          <div className="mt-8 flex items-center gap-3">
            <button type="button" onClick={() => go(-1)} aria-label="Slide sebelumnya" className="grid size-10 place-items-center rounded-full border border-white/40 hover:bg-white/10">
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <div className="flex gap-1.5">
              {SLIDES.map((s, k) => (
                <button
                  key={s.sport}
                  type="button"
                  onClick={() => setI(k)}
                  aria-label={`Tampilkan ${s.sport}`}
                  aria-current={k === i}
                  className={clsx("h-1.5 rounded-full transition-all", k === i ? "w-8 bg-victory" : "w-4 bg-white/40 hover:bg-white/70")}
                />
              ))}
            </div>
            <button type="button" onClick={() => go(1)} aria-label="Slide berikutnya" className="grid size-10 place-items-center rounded-full border border-white/40 hover:bg-white/10">
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
