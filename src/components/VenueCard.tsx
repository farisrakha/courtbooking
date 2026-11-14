import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin, Users } from "lucide-react";
import { formatIDR, hourLabel } from "@/lib/booking";
import { minPrice, type Venue } from "@/lib/venues";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";

export function VenueCard({ v }: { v: Venue }) {
  return (
    <Card className="group gap-0 rounded-2xl py-0 ring-border transition-shadow hover:shadow-lg hover:shadow-integrity/5">
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <Image src={v.images[0]} alt={v.name} fill sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
        <Badge className="absolute left-3 top-3">{v.sport}</Badge>
        {v.comingSoon && <Badge className="absolute right-3 top-3 bg-background text-victory">Segera hadir</Badge>}
      </div>
      <CardContent className="flex-1 px-5 pt-5">
        <CardTitle className="text-lg font-semibold text-primary">{v.name}</CardTitle>
        <ul className="mt-2 space-y-1 text-muted-foreground">
          <li className="flex items-center gap-2"><MapPin className="size-4" aria-hidden />{v.location}</li>
          <li className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-2"><Clock className="size-4" aria-hidden />{hourLabel(v.open)}–{hourLabel(v.close)}</span>
            <span className="flex items-center gap-2"><Users className="size-4" aria-hidden />maks. {v.maxPlayers} orang</span>
          </li>
        </ul>
      </CardContent>
      <CardFooter className="mt-5 items-end justify-between gap-3 border-t-0 bg-transparent px-5 pt-0 pb-5">
        <div>
          <p className="text-xs text-muted-foreground">Mulai</p>
          <p className="text-xl font-bold text-primary tabular-nums">{formatIDR(minPrice(v))}<span className="text-sm font-normal text-muted-foreground">/jam</span></p>
          <p className="mt-0.5 text-xs text-muted-foreground">{v.courts.length} lapangan</p>
        </div>
        {v.comingSoon ? (
          <button type="button" disabled className={buttonVariants({ variant: "cta" })}>Segera hadir</button>
        ) : (
          <Link href={`/venue/${v.slug}`} className={buttonVariants({ variant: "cta" })} aria-label={`Pesan ${v.name}`}>Pesan</Link>
        )}
      </CardFooter>
    </Card>
  );
}
