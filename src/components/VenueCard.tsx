import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin, Users } from "lucide-react";
import { formatIDR, hourLabel } from "@/lib/booking";
import { minPrice, type Venue } from "@/lib/venues";
import { btn, card } from "./ui";

export function VenueCard({ v }: { v: Venue }) {
  return (
    <article className={`${card} group flex flex-col overflow-hidden transition-shadow hover:shadow-lg hover:shadow-integrity/5`}>
      <div className="relative aspect-[16/10] overflow-hidden bg-platinum">
        <Image src={v.images[0]} alt={v.name} fill sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
        <span className="absolute left-3 top-3 rounded-full bg-integrity px-2.5 py-1 text-xs font-semibold text-white">{v.sport}</span>
        {v.comingSoon && <span className="absolute right-3 top-3 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-victory">Segera hadir</span>}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold text-integrity">{v.name}</h3>
        <ul className="mt-2 space-y-1 text-sm text-muted">
          <li className="flex items-center gap-2"><MapPin className="size-4" aria-hidden />{v.location}</li>
          <li className="flex items-center gap-4">
            <span className="flex items-center gap-2"><Clock className="size-4" aria-hidden />{hourLabel(v.open)}–{hourLabel(v.close)}</span>
            <span className="flex items-center gap-2"><Users className="size-4" aria-hidden />maks. {v.maxPlayers} orang</span>
          </li>
        </ul>
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            <p className="text-xs text-muted">Mulai</p>
            <p className="text-xl font-bold text-integrity tabular-nums">{formatIDR(minPrice(v))}<span className="text-sm font-normal text-muted">/jam</span></p>
            <p className="mt-0.5 text-xs text-muted">{v.courts.length} lapangan</p>
          </div>
          {v.comingSoon ? (
            <button type="button" disabled className={btn("primary")}>Segera hadir</button>
          ) : (
            <Link href={`/venue/${v.slug}`} className={btn("primary")} aria-label={`Pesan ${v.name}`}>Pesan</Link>
          )}
        </div>
      </div>
    </article>
  );
}
