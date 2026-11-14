import { Suspense } from "react";
import { Profile } from "@/components/Profile";

export const metadata = { title: "Profil" };

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Suspense fallback={<div className="h-[720px] animate-pulse rounded-2xl bg-muted" aria-label="Memuat" />}>
        <Profile />
      </Suspense>
    </div>
  );
}
