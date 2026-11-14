import { Suspense } from "react";
import { BookingDetail } from "@/components/BookingViews";

export const metadata = { title: "Detail booking" };

export default function BookingPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Suspense fallback={<div className="h-[720px] animate-pulse rounded-2xl bg-muted" aria-label="Memuat" />}>
        <BookingDetail />
      </Suspense>
    </div>
  );
}
