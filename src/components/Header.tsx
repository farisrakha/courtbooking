import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { AccountNav } from "./AccountNav";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur print:hidden">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" aria-label="INA Sports, ke beranda" className="shrink-0">
          <Image src="/brand/logo.svg" alt="INA Sports" width={112} height={25} priority />
        </Link>
        <nav aria-label="Utama" className="flex items-center gap-1.5 sm:gap-2">
          <Link href="/#venue" className={buttonVariants({ variant: "ghost", className: "hidden md:inline-flex" })}>
            Cari Lapangan
          </Link>
          <Link href="/#faq" className={buttonVariants({ variant: "ghost", className: "hidden md:inline-flex" })}>
            FAQ
          </Link>
          <Suspense fallback={<span className="h-10 w-40" aria-hidden />}>
            <AccountNav />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
