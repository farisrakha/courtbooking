import { Suspense } from "react";
import { AuthSkeleton } from "@/components/AuthCard";
import { ForgotForm } from "@/components/AuthForms";

export const metadata = { title: "Lupa kata sandi" };

export default function Page() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <ForgotForm />
    </Suspense>
  );
}
