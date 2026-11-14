import { Suspense } from "react";
import { AuthSkeleton } from "@/components/AuthCard";
import { PhoneStep } from "@/components/AuthForms";

export const metadata = { title: "Lengkapi akun" };

export default function Page() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <PhoneStep />
    </Suspense>
  );
}
