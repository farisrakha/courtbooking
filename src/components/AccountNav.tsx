"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use } from "react";
import { browser } from "react-dom";
import { CalendarDays, LogOut, UserRound } from "lucide-react";
import { initials, logout } from "@/lib/auth";
import { useUser } from "@/lib/useStore";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Header right side: Masuk/Daftar when logged out, Booking Saya + avatar menu when logged in. */
export function AccountNav() {
  use(browser("The session lives in localStorage."));
  const user = useUser();
  const router = useRouter();

  if (!user) {
    return (
      <>
        <Link href="/masuk" className={buttonVariants({ variant: "outline", className: "px-3 sm:px-4" })}>Masuk</Link>
        <Link href="/daftar" className={buttonVariants({ className: "px-3 sm:px-4" })}>Daftar</Link>
      </>
    );
  }

  return (
    <>
      <Link href="/bookings" className={buttonVariants({ variant: "ghost", className: "px-3 sm:px-4" })}>
        <CalendarDays className="size-4" aria-hidden />
        <span className="hidden sm:inline">Booking Saya</span>
        <span className="sr-only sm:hidden">Booking Saya</span>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label={`Menu akun ${user.name}`}>
          <Avatar className="size-10">
            <AvatarFallback className="bg-primary font-semibold text-primary-foreground">{initials(user.name)}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <span className="block truncate font-semibold text-foreground">{user.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link href="/profil"><UserRound aria-hidden />Profil</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/bookings"><CalendarDays aria-hidden />Booking Saya</Link></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => { logout(); router.push("/"); }}><LogOut aria-hidden />Keluar</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
