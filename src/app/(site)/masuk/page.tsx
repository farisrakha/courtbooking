import { Suspense } from "react";
import { AuthSkeleton } from "@/components/AuthCard";
import { LoginForm } from "@/components/AuthForms";

export const metadata = { title: "Masuk" };

export default function Page() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
