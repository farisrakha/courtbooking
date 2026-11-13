import { Suspense } from "react";
import { BookingList } from "@/components/BookingViews";

export const metadata = { title: "Booking Saya" };

export default function BookingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-integrity sm:text-3xl">Booking Saya</h1>
      <div className="mt-6">
        <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-platinum" aria-label="Memuat" />}>
          <BookingList />
        </Suspense>
      </div>
    </div>
  );
}
