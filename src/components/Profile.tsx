"use client";

// PRD F7: edit details, password, linked Google, logout, delete account.
import { redirect, useRouter } from "next/navigation";
import { use, useState } from "react";
import { browser } from "react-dom";
import { CircleCheck, LogOut } from "lucide-react";
import {
  PASSWORD_HINT, changePassword, deleteAccount, displayPhone, initials, logout, normalizePhone, passwordOk, phoneOk, updateUser,
} from "@/lib/auth";
import { forgetUser, shownStatus } from "@/lib/booking";
import { useBookings, useUser } from "@/lib/useStore";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const field = "h-11 rounded-xl";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="gap-0 rounded-2xl p-5 ring-border sm:p-6">
      <h2 className="font-semibold text-primary">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  );
}

function Msg({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <p role="status" className={`flex items-center gap-1.5 text-sm ${ok ? "text-ok" : "text-destructive"}`}>
      {ok && <CircleCheck className="size-4" aria-hidden />}{children}
    </p>
  );
}

export function Profile() {
  use(browser("Accounts live in localStorage in the demo."));
  const user = useUser();
  const bookings = useBookings();
  const router = useRouter();
  const [saved, setSaved] = useState<{ ok: boolean; text: string } | null>(null);
  const [pw, setPw] = useState<{ ok: boolean; text: string } | null>(null);
  if (!user) redirect("/masuk?next=%2Fprofil");

  const upcomingPaid = bookings.filter((b) => b.userEmail === user.email && shownStatus(b) === "paid").length;

  function saveDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (!f.name.trim()) return setSaved({ ok: false, text: "Nama tidak boleh kosong." });
    if (!phoneOk(f.phone)) return setSaved({ ok: false, text: "Nomor WhatsApp belum benar, contoh 081234567890." });
    updateUser(user!.email, { name: f.name.trim(), phone: normalizePhone(f.phone), team: f.team.trim() || undefined });
    setSaved({ ok: true, text: "Profil disimpan." });
  }

  async function savePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
    if (!passwordOk(f.next)) return setPw({ ok: false, text: PASSWORD_HINT });
    if (!(await changePassword(user!.email, f.current ?? "", f.next))) return setPw({ ok: false, text: "Kata sandi saat ini salah." });
    form.reset();
    setPw({ ok: true, text: user!.passwordHash ? "Kata sandi diganti." : "Kata sandi dibuat. Sekarang kamu juga bisa masuk dengan email." });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          <AvatarFallback className="bg-primary text-xl font-semibold text-primary-foreground">{initials(user.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-primary">{user.name}</h1>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <Section title="Data diri" description="Dipakai untuk mengisi data pemain saat booking.">
        <form onSubmit={(e) => { setSaved(null); saveDetails(e); }} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="name">Nama lengkap</Label><Input id="name" name="name" autoComplete="name" defaultValue={user.name} className={field} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email} readOnly disabled className={field} aria-describedby="email-hint" />
            <p id="email-hint" className="text-xs text-muted-foreground">{user.verified ? "Terverifikasi." : "Belum terverifikasi."} Email tidak bisa diubah.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="phone">Nomor WhatsApp</Label><Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={displayPhone(user.phone)} className={field} /></div>
            <div className="space-y-1.5"><Label htmlFor="team">Nama tim default</Label><Input id="team" name="team" defaultValue={user.team} className={field} placeholder="Opsional" /></div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit">Simpan perubahan</Button>
            {saved && <Msg ok={saved.ok}>{saved.text}</Msg>}
          </div>
        </form>
      </Section>

      <Section title={user.passwordHash ? "Ubah kata sandi" : "Buat kata sandi"} description={user.passwordHash ? undefined : "Akunmu masuk lewat Google. Buat kata sandi kalau ingin bisa masuk dengan email juga."}>
        <form onSubmit={(e) => { setPw(null); savePassword(e); }} className="space-y-4">
          {user.passwordHash && (
            <div className="space-y-1.5"><Label htmlFor="current">Kata sandi saat ini</Label><Input id="current" name="current" type="password" autoComplete="current-password" required className={field} /></div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="next">Kata sandi baru</Label>
            <Input id="next" name="next" type="password" autoComplete="new-password" required className={field} aria-describedby="next-hint" />
            <p id="next-hint" className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" variant="outline">Simpan kata sandi</Button>
            {pw && <Msg ok={pw.ok}>{pw.text}</Msg>}
          </div>
        </form>
      </Section>

      <Section title="Cara masuk">
        <ul className="divide-y rounded-xl border text-sm">
          <li className="flex items-center justify-between gap-3 p-3">
            <span>Google</span>
            {user.google ? <Badge className="bg-ok-soft text-ok">Terhubung</Badge> : <Badge variant="outline">Belum terhubung</Badge>}
          </li>
          <li className="flex items-center justify-between gap-3 p-3">
            <span>Email &amp; kata sandi</span>
            {user.passwordHash ? <Badge className="bg-ok-soft text-ok">Aktif</Badge> : <Badge variant="outline">Belum dibuat</Badge>}
          </li>
        </ul>
        {!user.google && <p className="mt-3 text-xs text-muted-foreground">Untuk menghubungkan Google, keluar lalu pilih &quot;Lanjutkan dengan Google&quot; dengan email yang sama.</p>}
      </Section>

      <Section title="Akun">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => { logout(); router.push("/"); }}><LogOut aria-hidden />Keluar</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="destructive">Hapus akun</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{upcomingPaid ? "Akun belum bisa dihapus" : "Hapus akun?"}</AlertDialogTitle>
                <AlertDialogDescription>
                  {upcomingPaid
                    ? `Kamu masih punya ${upcomingPaid} booking lunas yang akan datang. Batalkan atau selesaikan dulu, lalu coba lagi.`
                    : "Data diri kamu dihapus. Catatan transaksi tetap disimpan tanpa nama untuk keperluan keuangan. Tindakan ini tidak bisa dibatalkan."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{upcomingPaid ? "Tutup" : "Tidak jadi"}</AlertDialogCancel>
                {!upcomingPaid && (
                  <AlertDialogAction variant="destructive" onClick={() => { forgetUser(user.email); deleteAccount(user.email); router.push("/"); }}>
                    Ya, hapus akun
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Section>
    </div>
  );
}
