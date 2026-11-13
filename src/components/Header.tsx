import Image from "next/image";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { btn } from "./ui";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur print:hidden">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="INA Sports, ke beranda" className="shrink-0">
          <Image src="/brand/logo.svg" alt="INA Sports" width={120} height={27} priority />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/#venue" className={`${btn("ghost")} hidden sm:inline-flex`}>
            Cari Lapangan
          </Link>
          <Link href="/bookings" className={btn("outline")}>
            <CalendarDays className="size-4" aria-hidden />
            Booking Saya
          </Link>
        </nav>
      </div>
    </header>
  );
}
