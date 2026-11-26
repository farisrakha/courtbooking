"use client";

// PRD F1 (Daftar), F2 (Masuk, lupa/atur sandi) and email verification, on the demo auth in lib/auth.ts.
import Link from "next/link";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useState } from "react";
import { browser } from "react-dom";
import { CircleCheck, MailCheck, TriangleAlert } from "lucide-react";
import {
  PASSWORD_HINT, findUser, googleSignIn, login, normalizePhone, passwordOk, phoneOk,
  register, requestReset, resendVerify, resetPassword, safeNext, updateUser, verifyEmail, verifyTokenOwner,
} from "@/lib/auth";
import { blockLength, formatDate, hourLabel } from "@/lib/booking";
import { getVenue } from "@/lib/venues";
import { useUser } from "@/lib/useStore";
import { AuthCard } from "./AuthCard";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const enc = encodeURIComponent;
type Errors = Record<string, React.ReactNode>;

function useNext() {
  return safeNext(useSearchParams().get("next"));
}

/** After any successful sign-in: Google users without a phone add it first, then go to `next`. */
function afterSignIn(user: { phone: string } | null, next: string) {
  if (user) redirect(user.phone ? next : `/daftar/whatsapp?next=${enc(next)}`);
}

function Field({ id, label, error, hint, ...input }: { id: string; label: React.ReactNode; error?: React.ReactNode; hint?: string } & React.ComponentProps<"input">) {
  const desc = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} aria-invalid={error ? true : undefined} aria-describedby={desc} className="h-11 rounded-xl" {...input} />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function focusFirst(errors: Errors) {
  const first = Object.keys(errors)[0];
  if (first) document.getElementById(first)?.focus();
  return !first;
}

const emailOk = (e: string) => /^\S+@\S+\.\S+$/.test(e.trim());

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground" aria-hidden>
      <span className="h-px flex-1 bg-border" />atau<span className="h-px flex-1 bg-border" />
    </div>
  );
}

function Notice({ tone = "ok", children }: { tone?: "ok" | "warn"; children: React.ReactNode }) {
  const Icon = tone === "ok" ? CircleCheck : TriangleAlert;
  return (
    <p role="status" className={`flex items-start gap-2 rounded-xl p-3 text-sm ${tone === "ok" ? "bg-ok-soft text-ok" : "bg-destructive/10 text-destructive"}`}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/** Stand-in for Google one-tap: pick the email Google would return. */
function GoogleButton() {
  const [needPw, setNeedPw] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = await googleSignIn(String(f.get("g-email")), String(f.get("g-name") ?? ""), needPw ? String(f.get("g-password")) : undefined);
    if ("error" in r) {
      if (r.error === "needs-password") setNeedPw(true);
      else setErr("Kata sandi salah.");
    }
    // Success: the page re-renders with a user and redirects (see afterSignIn).
  }

  return (
    <Dialog onOpenChange={() => { setNeedPw(false); setErr(""); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="w-full border-border text-foreground">
          <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground" aria-hidden>G</span>
          Lanjutkan dengan Google
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lanjutkan dengan Google</DialogTitle>
          <DialogDescription>Mode demo: tulis email yang mau dipakai. Di versi asli, jendela akun Google yang muncul di sini.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field id="g-email" label="Email Google" type="email" required autoComplete="email" placeholder="nama@gmail.com" />
          {!needPw && <Field id="g-name" label="Nama" autoComplete="name" placeholder="Nama di akun Google" />}
          {needPw && (
            <Field
              id="g-password" label="Kata sandi INA Sports" type="password" required autoComplete="current-password"
              hint="Email ini sudah terdaftar dengan kata sandi. Masukkan sekali untuk menghubungkan Google." error={err || undefined}
            />
          )}
          <Button type="submit" size="lg" className="w-full">{needPw ? "Hubungkan & masuk" : "Lanjutkan"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- F1 Daftar ----------------

export function RegisterForm() {
  use(browser("Accounts live in localStorage in the demo."));
  const user = useUser();
  const router = useRouter();
  const next = useNext();
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  if (!busy) afterSignIn(user, next);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const err: Errors = {};
    if (!f.name?.trim()) err.name = "Isi nama lengkap kamu.";
    if (!emailOk(f.email ?? "")) err.email = "Format email belum benar, contoh nama@email.com.";
    else if (findUser(f.email)) err.email = <>Email ini sudah terdaftar. <Link href={`/masuk?next=${enc(next)}`} className="font-semibold underline">Masuk saja?</Link></>;
    if (!phoneOk(f.phone ?? "")) err.phone = "Nomor WhatsApp belum benar, contoh 081234567890.";
    if (!passwordOk(f.password ?? "")) err.password = PASSWORD_HINT;
    if (!f.terms) err.terms = "Setujui Syarat & Ketentuan dan Kebijakan Privasi dulu.";
    setErrors(err);
    if (!focusFirst(err)) return;
    setBusy(true); // keeps afterSignIn from jumping past the verify screen
    await register({ name: f.name, email: f.email, phone: f.phone, password: f.password });
    router.push(`/verifikasi-email?next=${enc(next)}`);
  }

  return (
    <AuthCard
      title="Buat akun INA Sports"
      description="Supaya booking tersimpan dan kamu tidak perlu isi data lagi."
      footer={<>Sudah punya akun? <Link href={`/masuk?next=${enc(next)}`} className="font-semibold text-primary hover:underline">Masuk</Link></>}
    >
      <GoogleButton />
      <Divider />
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field id="name" label="Nama lengkap" autoComplete="name" placeholder="Nama sesuai KTP" error={errors.name} />
        <Field id="email" label="Email" type="email" autoComplete="email" placeholder="nama@email.com" error={errors.email} />
        <Field id="phone" label="Nomor WhatsApp" type="tel" inputMode="tel" autoComplete="tel" placeholder="08xxxxxxxxxx" error={errors.phone} hint="Untuk konfirmasi booking." />
        <Field id="password" label="Kata sandi" type="password" autoComplete="new-password" error={errors.password} hint={PASSWORD_HINT} />
        <div className="space-y-1.5">
          <div className="flex items-start gap-3">
            <Checkbox id="terms" name="terms" className="mt-0.5" aria-invalid={errors.terms ? true : undefined} aria-describedby={errors.terms ? "terms-error" : undefined} />
            <Label htmlFor="terms" className="block leading-snug font-normal text-muted-foreground">
              Saya setuju dengan <a href="#" className="font-medium text-primary underline">Syarat &amp; Ketentuan</a> dan <a href="#" className="font-medium text-primary underline">Kebijakan Privasi</a> INA Sports.
            </Label>
          </div>
          {errors.terms && <p id="terms-error" className="text-xs text-destructive">{errors.terms}</p>}
        </div>
        <Button type="submit" variant="cta" size="lg" className="w-full" disabled={busy}>Daftar</Button>
      </form>
    </AuthCard>
  );
}

/** Google sign-ups have no phone yet: one short step before continuing. */
export function PhoneStep() {
  use(browser("Accounts live in localStorage in the demo."));
  const user = useUser();
  const next = useNext();
  const [error, setError] = useState("");
  if (!user) redirect(`/masuk?next=${enc(next)}`);
  if (user.phone) redirect(next);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const phone = String(f.get("phone"));
    if (!phoneOk(phone)) { setError("Nomor WhatsApp belum benar, contoh 081234567890."); document.getElementById("phone")?.focus(); return; }
    updateUser(user!.email, { phone: normalizePhone(phone), team: String(f.get("team")).trim() || undefined });
  }

  return (
    <AuthCard title="Satu langkah lagi" description={<>Halo {user.name}! Tambahkan nomor WhatsApp untuk konfirmasi booking.</>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field id="phone" label="Nomor WhatsApp" type="tel" inputMode="tel" autoComplete="tel" placeholder="08xxxxxxxxxx" error={error || undefined} />
        <Field id="team" label={<>Nama tim <span className="font-normal text-muted-foreground">(opsional)</span></>} placeholder="Kalau sering main bareng tim" />
        <Button type="submit" variant="cta" size="lg" className="w-full">Simpan &amp; lanjut</Button>
      </form>
    </AuthCard>
  );
}

// ---------------- Verifikasi email ----------------

export function VerifyEmail() {
  use(browser("Accounts live in localStorage in the demo."));
  const params = useSearchParams();
  const token = params.get("token");
  const next = safeNext(params.get("next"));
  const user = useUser(); // also re-renders when the users store changes
  const [msg, setMsg] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);
  useEffect(() => { if (token) verifyEmail(token); }, [token]);

  if (token) {
    const owner = verifyTokenOwner(token);
    return owner ? (
      <AuthCard title={owner.verified ? "Email terverifikasi" : "Memverifikasi…"} description="Akunmu sudah aktif. Sekarang kamu bisa membayar booking.">
        <Link href={next} className={buttonVariants({ size: "lg", className: "w-full" })}>Lanjut</Link>
      </AuthCard>
    ) : (
      <AuthCard title="Tautan sudah tidak berlaku" description="Tautan verifikasi hanya berlaku 24 jam. Kirim ulang dari halaman verifikasi.">
        <Link href={`/verifikasi-email?next=${enc(next)}`} className={buttonVariants({ size: "lg", className: "w-full" })}>Kirim ulang tautan</Link>
      </AuthCard>
    );
  }

  if (!user) redirect(`/masuk?next=${enc(`/verifikasi-email?next=${enc(next)}`)}`);
  if (user.verified) {
    return (
      <AuthCard title="Email sudah terverifikasi" description={user.email}>
        <Link href={next} className={buttonVariants({ size: "lg", className: "w-full" })}>Lanjut</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Cek email kamu"
      description={<>Kami mengirim tautan verifikasi ke <b className="text-foreground">{user.email}</b>. Kamu sudah bisa melihat jadwal, tapi perlu verifikasi sebelum membayar.</>}
    >
      <div className="grid place-items-center rounded-2xl bg-secondary py-6 text-primary"><MailCheck className="size-10" aria-hidden /></div>
      <div className="mt-4 rounded-xl border border-dashed p-3 text-sm">
        <p className="text-muted-foreground">Mode demo, isi email:</p>
        <Link href={`/verifikasi-email?token=${user.verifyToken?.token}&next=${enc(next)}`} className="font-semibold text-primary underline">Verifikasi email saya</Link>
      </div>
      {msg && <div className="mt-4"><Notice tone={msg.tone}>{msg.text}</Notice></div>}
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Button
          variant="outline"
          onClick={() => setMsg(resendVerify(user.email) ? { tone: "ok", text: "Tautan baru sudah dikirim." } : { tone: "warn", text: "Tunggu 60 detik sebelum kirim ulang." })}
        >
          Kirim ulang
        </Button>
        <Link href={next} className={buttonVariants({ variant: "ghost" })}>Nanti saja</Link>
      </div>
    </AuthCard>
  );
}

// ---------------- F2 Masuk (+ login gate) ----------------

/** "Slot kamu tetap tersimpan" when the login came from checkout. */
function GateSummary({ next }: { next: string }) {
  if (!next.startsWith("/checkout?")) return null;
  const p = new URLSearchParams(next.split("?")[1]);
  const v = getVenue(p.get("venue") ?? "");
  const pkg = v?.packages?.find((x) => x.id === p.get("pkg"));
  const court = v?.courts.find((c) => c.id === p.get("court"));
  const dates = (pkg ? p.get("dates") ?? "" : p.get("date") ?? "").split(",");
  const hour = Number(p.get("hour"));
  if (!v || !(pkg || court) || !dates.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))) return null;
  const day = (d: string) => formatDate(d, { weekday: "short", day: "numeric", month: "short" });
  return (
    <div className="mb-5 rounded-xl bg-secondary p-4 text-sm">
      <p className="font-semibold text-primary">{pkg ? "Tanggal acaramu" : "Slot kamu"} tetap tersimpan</p>
      <p className="mt-1 text-secondary-foreground/80">
        {pkg ? (
          <>{v.name} · {pkg.label} · {dates.map(day).join(" · ")}</>
        ) : (
          <>{v.name} · {court!.name}{p.get("tier") === "klub" ? " (Sewa Klub)" : ""} · {day(dates[0])} · <span className="tabular-nums">{hourLabel(hour)}–{hourLabel(hour + blockLength(v))}</span></>
        )}
      </p>
    </div>
  );
}

export function LoginForm() {
  use(browser("Accounts live in localStorage in the demo."));
  const user = useUser();
  const next = useNext();
  const [error, setError] = useState<React.ReactNode>(null);
  afterSignIn(user, next);
  const gate = next.startsWith("/checkout?");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = await login(String(f.get("email")), String(f.get("password")), f.get("remember") === "on");
    if (!("error" in r)) return; // re-render redirects
    if (r.error === "locked") setError(`Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil((r.until - Date.now()) / 60_000)} menit.`);
    else if (r.error === "google-only") setError("Akun ini memakai Google. Pilih Lanjutkan dengan Google.");
    else setError("Email atau kata sandi salah.");
  }

  return (
    <AuthCard
      title={gate ? "Masuk dulu untuk lanjut bayar" : "Masuk ke INA Sports"}
      description={gate ? undefined : "Lihat dan kelola booking kamu."}
      footer={<>Belum punya akun? <Link href={`/daftar?next=${enc(next)}`} className="font-semibold text-primary hover:underline">Daftar</Link></>}
    >
      <GateSummary next={next} />
      <GoogleButton />
      <Divider />
      <form onSubmit={submit} className="space-y-4">
        {error && <Notice tone="warn">{error}</Notice>}
        <Field id="email" label="Email" type="email" required autoComplete="email" placeholder="nama@email.com" />
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password">Kata sandi</Label>
            <Link href="/lupa-sandi" className="text-xs font-medium text-primary hover:underline">Lupa kata sandi?</Link>
          </div>
          <Input id="password" name="password" type="password" required autoComplete="current-password" className="h-11 rounded-xl" />
        </div>
        <div className="flex items-center gap-3">
          <Checkbox id="remember" name="remember" defaultChecked />
          <Label htmlFor="remember" className="font-normal">Ingat saya selama 30 hari</Label>
        </div>
        <Button type="submit" variant="cta" size="lg" className="w-full">Masuk</Button>
      </form>
    </AuthCard>
  );
}

// ---------------- Lupa / atur kata sandi ----------------

export function ForgotForm() {
  use(browser("Accounts live in localStorage in the demo."));
  const [sent, setSent] = useState<{ token: string | null } | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSent({ token: requestReset(String(new FormData(e.currentTarget).get("email"))) });
  }

  return (
    <AuthCard
      title="Lupa kata sandi"
      description="Masukkan email akunmu. Kami kirim tautan untuk membuat kata sandi baru (berlaku 1 jam)."
      footer={<Link href="/masuk" className="font-semibold text-primary hover:underline">Kembali ke Masuk</Link>}
    >
      {sent ? (
        <div className="space-y-4">
          <Notice>Kalau email terdaftar, tautan sudah dikirim. Cek kotak masuk dan folder spam.</Notice>
          {sent.token && (
            <div className="rounded-xl border border-dashed p-3 text-sm">
              <p className="text-muted-foreground">Mode demo, isi email:</p>
              <Link href={`/atur-sandi?token=${sent.token}`} className="font-semibold text-primary underline">Atur kata sandi baru</Link>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field id="email" label="Email" type="email" required autoComplete="email" placeholder="nama@email.com" />
          <Button type="submit" size="lg" className="w-full">Kirim tautan</Button>
        </form>
      )}
    </AuthCard>
  );
}

export function ResetForm() {
  use(browser("Accounts live in localStorage in the demo."));
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const pw = String(f.get("password"));
    const err: Errors = {};
    if (!passwordOk(pw)) err.password = PASSWORD_HINT;
    else if (pw !== f.get("confirm")) err.confirm = "Kata sandi tidak sama.";
    setErrors(err);
    if (!focusFirst(err)) return;
    if (await resetPassword(token, pw)) router.push("/");
    else setErrors({ form: <>Tautan sudah tidak berlaku. <Link href="/lupa-sandi" className="font-semibold underline">Minta tautan baru</Link></> });
  }

  return (
    <AuthCard title="Buat kata sandi baru" description="Setelah disimpan, kamu langsung masuk.">
      <form onSubmit={submit} noValidate className="space-y-4">
        {errors.form && <Notice tone="warn">{errors.form}</Notice>}
        <Field id="password" label="Kata sandi baru" type="password" autoComplete="new-password" error={errors.password} hint={PASSWORD_HINT} />
        <Field id="confirm" label="Ulangi kata sandi" type="password" autoComplete="new-password" error={errors.confirm} />
        <Button type="submit" variant="cta" size="lg" className="w-full">Simpan kata sandi</Button>
      </form>
    </AuthCard>
  );
}
