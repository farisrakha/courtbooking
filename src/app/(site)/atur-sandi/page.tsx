import { Suspense } from "react";
import { AuthSkeleton } from "@/components/AuthCard";
import { ResetForm } from "@/components/AuthForms";

export const metadata = { title: "Atur kata sandi" };

export default function Page() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <ResetForm />
    </Suspense>
  );
}
