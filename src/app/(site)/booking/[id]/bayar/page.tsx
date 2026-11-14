import { Suspense } from "react";
import { PayInstructions } from "@/components/BookingViews";

export const metadata = { title: "Instruksi pembayaran" };

export default function PayPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Suspense fallback={<div className="h-[640px] animate-pulse rounded-2xl bg-muted" aria-label="Memuat" />}>
        <PayInstructions />
      </Suspense>
    </div>
  );
}
