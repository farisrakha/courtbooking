import { Suspense } from "react";
import { AuthSkeleton } from "@/components/AuthCard";
import { VerifyEmail } from "@/components/AuthForms";

export const metadata = { title: "Verifikasi email" };

export default function Page() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <VerifyEmail />
    </Suspense>
  );
}
