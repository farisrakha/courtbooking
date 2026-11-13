import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Check, Clock, MapPin, Users } from "lucide-react";
import { SlotPicker, SlotPickerSkeleton } from "@/components/SlotPicker";
import { card } from "@/components/ui";
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
      <Suspense fallback={<div className="mt-6 h-[640px] animate-pulse rounded-2xl bg-platinum" aria-label="Memuat venue" />}>
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
            <span className="absolute left-3 top-3 rounded-full bg-integrity px-2.5 py-1 text-xs font-semibold text-white">{v.sport}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {v.images.slice(1, 4).map((src) => (
              <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-platinum">
                <Image src={src} alt="" fill sizes="150px" className="object-cover" />
              </div>
            ))}
          </div>

          <section className={`${card} p-5`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-integrity">{v.name}</h1>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted"><MapPin className="size-4" aria-hidden />{v.address}</p>
              </div>
              <p className="shrink-0 text-right">
                <span className="block text-xs text-muted">Mulai</span>
                <span className="text-xl font-bold text-integrity tabular-nums">{formatIDR(minPrice(v))}</span>
                <span className="block text-xs text-muted">/jam</span>
              </p>
            </div>
            <p className="mt-4 text-sm leading-relaxed">{v.description}</p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-y border-line py-3 text-sm">
              <span className="flex items-center gap-2"><Clock className="size-4 text-muted" aria-hidden />{hourLabel(v.open)}–{hourLabel(v.close)}</span>
              <span className="flex items-center gap-2"><Users className="size-4 text-muted" aria-hidden />maks. {v.maxPlayers} orang</span>
            </div>
            <h2 className="mt-4 text-sm font-semibold">Fasilitas</h2>
            <ul className="mt-2 grid grid-cols-2 gap-2 text-sm">
              {v.amenities.map((a) => (
                <li key={a} className="flex items-center gap-2"><Check className="size-4 text-ok" aria-hidden />{a}</li>
              ))}
            </ul>
          </section>
        </div>

        {v.comingSoon ? (
          <div className={`${card} p-8 text-center`}>
            <p className="text-lg font-semibold text-integrity">Segera hadir</p>
            <p className="mt-2 text-sm text-muted">Venue ini belum bisa dipesan online. Hubungi info@inasports.id untuk jadwal dan tarif.</p>
          </div>
        ) : (
          <Suspense fallback={<SlotPickerSkeleton />}>
            <SlotPicker venue={v} />
          </Suspense>
        )}
      </div>
  );
}
