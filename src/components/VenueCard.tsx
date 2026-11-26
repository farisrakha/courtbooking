import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin, Users } from "lucide-react";
import { formatIDR, hourLabel } from "@/lib/booking";
import { fromPrice, rentalTypes, type Venue } from "@/lib/venues";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";

/** Cheapest package per type ("Event", "Tribun") for the event tab. */
function packagePrices(v: Venue) {
  return [...new Set(v.packages?.map((p) => p.type))].map((type) => {
    const p = v.packages!.filter((x) => x.type === type).reduce((a, b) => (b.price < a.price ? b : a));
    return { type, price: p.price, unit: p.hours === 16 ? "hari" : "12 jam" };
  });
}

/**
 * `mode` is the home tab: "event" shows package prices and opens the venue on its event tab.
 * The whole card is one link (stretched over the title); red stays for the page's main action.
 */
export function VenueCard({ v, mode = "retail" }: { v: Venue; mode?: "retail" | "event" }) {
  const types = mode === "retail" ? [] : rentalTypes(v).filter((t) => t !== "Retail"); // retail tab: every card is retail
  const href = mode === "event" && v.packages?.length ? `/venue/${v.slug}?mode=event` : `/venue/${v.slug}`;
  const prices = mode === "event" && v.packages?.length ? packagePrices(v) : null;
  const from = fromPrice(v, mode);
  return (
    <Card className="group relative gap-0 rounded-2xl py-0 ring-border transition-shadow focus-within:ring-3 focus-within:ring-ring/50 hover:shadow-lg hover:shadow-integrity/5">
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <Image src={v.images[0]} alt="" fill sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
        <span className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {mode === "retail" && v.sport && <Badge>{v.sport}</Badge>}
          {types.map((t) => <Badge key={t}>Sewa {t}</Badge>)}
        </span>
        {v.comingSoon && <Badge className="absolute right-3 top-3 bg-background text-primary">Segera hadir</Badge>}
      </div>
      <CardContent className="flex-1 px-5 pt-5">
        <CardTitle className="text-lg font-semibold text-primary">
          {v.comingSoon ? v.name : (
            <Link href={href} className="outline-none after:absolute after:inset-0 after:rounded-2xl">{v.name}</Link>
          )}
        </CardTitle>
        <ul className="mt-2 space-y-1 text-muted-foreground">
          <li className="flex items-center gap-2"><MapPin className="size-4" aria-hidden />{v.location}</li>
          <li className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-2"><Clock className="size-4" aria-hidden />{hourLabel(v.open)}–{hourLabel(v.close)}</span>
            {mode === "retail" && v.block !== "visit" && <span className="flex items-center gap-2"><Users className="size-4" aria-hidden />maks. {v.maxPlayers} orang</span>}
          </li>
        </ul>
      </CardContent>
      <CardFooter className="mt-5 items-end justify-between gap-3 border-t-0 bg-transparent px-5 pt-0 pb-5">
        {prices ? (
          <dl className="space-y-0.5">
            {prices.map((p) => (
              <div key={p.type} className="flex items-baseline gap-2">
                <dt className="w-12 text-xs text-muted-foreground">{p.type}</dt>
                <dd className="font-bold text-primary tabular-nums">{formatIDR(p.price)}<span className="text-xs font-normal text-muted-foreground"> / {p.unit}</span></dd>
              </div>
            ))}
          </dl>
        ) : (
          <div>
            <p className="text-xs text-muted-foreground">Mulai</p>
            <p className="text-xl font-bold text-primary tabular-nums">
              {formatIDR(from.price)}<span className="whitespace-nowrap text-sm font-normal text-muted-foreground"> / {from.unit}</span>
            </p>
          </div>
        )}
        {/* Decorative: the stretched title link already covers the card. */}
        <span aria-hidden className={buttonVariants({ variant: "outline", className: v.comingSoon ? "opacity-60" : "group-hover:border-primary" })}>
          {v.comingSoon ? "Segera hadir" : "Pesan"}
        </span>
      </CardFooter>
    </Card>
  );
}
