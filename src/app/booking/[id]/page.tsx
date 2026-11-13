import { Suspense } from "react";
import { Confirmation } from "@/components/BookingViews";

export const metadata = { title: "Booking berhasil" };

export default function BookingPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Suspense fallback={<div className="h-[720px] animate-pulse rounded-2xl bg-platinum" aria-label="Memuat" />}>
        <Confirmation />
      </Suspense>
    </div>
  );
}
