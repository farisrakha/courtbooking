import { Suspense } from "react";
import { CheckoutForm } from "@/components/CheckoutForm";

export const metadata = { title: "Pembayaran" };

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Suspense fallback={<div className="h-[720px] animate-pulse rounded-2xl bg-platinum" aria-label="Memuat" />}>
        <CheckoutForm />
      </Suspense>
    </div>
  );
}
