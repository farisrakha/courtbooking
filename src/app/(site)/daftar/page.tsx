import { Suspense } from "react";
import { AuthSkeleton } from "@/components/AuthCard";
import { RegisterForm } from "@/components/AuthForms";

export const metadata = { title: "Daftar" };

export default function Page() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <RegisterForm />
    </Suspense>
  );
}
