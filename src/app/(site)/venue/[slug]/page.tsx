import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Check, Clock, MapPin, Users } from "lucide-react";
import { SlotPicker, SlotPickerSkeleton } from "@/components/SlotPicker";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatIDR, hourLabel } from "@/lib/booking";
import { VENUES, getVenue, minPrice } from "@/lib/venues";

export function generateStaticParams() {
  return VENUES.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({ params }: PageProps<"/venue/[slug]">) {
  const v = getVenue((await params).slug);
  return { title: v?.name ?? "Venue" };
}

// The back link is the App Shell; everything that depends on `params` streams in behind Suspense.
export default function VenuePage({ params }: PageProps<"/venue/[slug]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/#venue" className="inline-flex items-center gap-2 text-sm font-medium text-integrity hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Kembali ke daftar venue
      </Link>
      <Suspense fallback={<div className="mt-6 h-[640px] animate-pulse rounded-2xl bg-muted" aria-label="Memuat venue" />}>
        <VenueDetail params={params} />
      </Suspense>
    </div>
  );
}

async function VenueDetail({ params }: { params: Promise<{ slug: string }> }) {
  const v = getVenue((await params).slug);
  if (!v) notFound();

  return (
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        <div className="space-y-4 lg:sticky lg:top-24">
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-platinum">
            <Image src={v.images[0]} alt={v.name} fill priority sizes="(min-width: 1024px) 460px, 100vw" className="object-cover" />
            <Badge className="absolute left-3 top-3">{v.sport}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {v.images.slice(1, 4).map((src) => (
              <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-platinum">
                <Image src={src} alt="" fill sizes="150px" className="object-cover" />
              </div>
            ))}
          </div>

          <Card className="gap-0 rounded-2xl p-5 ring-border">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-integrity">{v.name}</h1>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-4" aria-hidden />{v.address}</p>
              </div>
              <p className="shrink-0 text-right">
                <span className="block text-xs text-muted-foreground">Mulai</span>
                <span className="text-xl font-bold text-integrity tabular-nums">{formatIDR(minPrice(v))}</span>
                <span className="block text-xs text-muted-foreground">/jam</span>
              </p>
            </div>
            <p className="mt-4 text-sm leading-relaxed">{v.description}</p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-y border-line py-3 text-sm">
              <span className="flex items-center gap-2"><Clock className="size-4 text-muted-foreground" aria-hidden />{hourLabel(v.open)}–{hourLabel(v.close)}</span>
              <span className="flex items-center gap-2"><Users className="size-4 text-muted-foreground" aria-hidden />maks. {v.maxPlayers} orang</span>
            </div>
            <h2 className="mt-4 text-sm font-semibold">Fasilitas</h2>
            <ul className="mt-2 grid grid-cols-2 gap-2 text-sm">
              {v.amenities.map((a) => (
                <li key={a} className="flex items-center gap-2"><Check className="size-4 text-ok" aria-hidden />{a}</li>
              ))}
            </ul>
          </Card>
        </div>

        {v.comingSoon ? (
          <Card className="gap-0 rounded-2xl p-8 text-center ring-border">
            <p className="text-lg font-semibold text-integrity">Segera hadir</p>
            <p className="mt-2 text-sm text-muted-foreground">Venue ini belum bisa dipesan online. Hubungi info@inasports.id untuk jadwal dan tarif.</p>
          </Card>
        ) : (
          <Suspense fallback={<SlotPickerSkeleton />}>
            <SlotPicker venue={v} />
          </Suspense>
        )}
      </div>
  );
}
