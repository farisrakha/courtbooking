import Image from "next/image";
import Link from "next/link";
import { CalendarClock, ShieldCheck, Wallet } from "lucide-react";
import { HeroCarousel } from "@/components/HeroCarousel";
import { VenueBrowser } from "@/components/VenueBrowser";
import { eyebrow } from "@/components/styles";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

const STEPS = [
  { t: "Pilih venue & jadwal", d: "Tentukan lapangan, tanggal, dan jam yang masih kosong." },
  { t: "Isi data & bayar", d: "Bayar lewat QRIS, e-wallet, virtual account, atau kartu." },
  { t: "Datang & main", d: "Tunjukkan kode booking di meja venue 15 menit sebelum mulai." },
];

const BENEFITS = [
  { icon: ShieldCheck, t: "Venue resmi milik negara", d: "Dikelola LPUK Kemenpora di kawasan Senayan dan Cibubur. Harga jelas, tanpa calo." },
  { icon: CalendarClock, t: "Jam kosong terlihat jelas", d: "Lihat jadwal tiap lapangan untuk 7 hari ke depan, pilih slot 2 jam, beres." },
  { icon: Wallet, t: "Bayar cara apa saja", d: "Pakai metode yang biasa kamu pakai. Kode booking langsung terbit setelah bayar." },
];

// ponytail: text badges, not brand logos. Swap in official logo files once we have them.
const PAYMENTS = ["QRIS", "GoPay", "DANA", "OVO", "BCA Virtual Account", "Mandiri Virtual Account", "Kartu debit/kredit"];

// Keep in sync with PAYMENT_METHODS / VOUCHERS in src/lib/booking.ts and the PRD.
const FAQ = [
  { q: "Bagaimana cara booking lapangan?", a: "Pilih venue, pilih tanggal dan slot 2 jam yang masih kosong di jadwal, isi data pemain, lalu bayar. Panjat tebing memakai tiket harian per kedatangan. Kode booking langsung muncul setelah pembayaran berhasil." },
  { q: "Apakah harganya sama setiap hari?", a: "Tidak selalu. Tenis dan bulu tangkis punya tarif akhir pekan, GOR POPKI punya tarif peak hour di sore dan malam hari, dan Aquatic serta Panahan membedakan sewa perorangan dan sewa klub. Harga tiap slot terlihat di jadwal." },
  { q: "Bisakah menyewa venue untuk event, tribun, atau ujian?", a: "Bisa. Pilih tab Sewa Event, Tribun & Ruangan, pilih paket (12 jam atau 1 hari/16 jam) dan tanggal acara. Kamu bisa bayar lunas atau DP 50%. Tarif belum termasuk pajak, listrik, air, dan service charge, dan ada Uang Jaminan 30% yang dibayar terpisah." },
  { q: "Metode pembayaran apa saja yang bisa dipakai?", a: "QRIS dan e-wallet (GoPay, DANA, OVO) tanpa biaya tambahan. BCA dan Mandiri Virtual Account dikenai biaya Rp6.000. Kartu debit/kredit dikenai biaya 2,9% + Rp2.000." },
  { q: "Apakah saya perlu punya akun?", a: "Kamu bisa melihat venue dan jadwal tanpa akun. Untuk membayar, masuk atau daftar dulu dengan Google atau email, supaya semua booking tersimpan di Booking Saya." },
  { q: "Bisakah booking dibatalkan?", a: "Bisa, paling lambat 2 jam sebelum jadwal mulai, lewat halaman Booking Saya. Setelah itu slot dibuka lagi untuk pemain lain." },
  { q: "Apa yang perlu dibawa ke venue?", a: "Datang 15 menit sebelum jadwal, lalu tunjukkan kode booking dan kartu identitas di meja venue." },
  { q: "Ada promo atau voucher?", a: "Masukkan kode voucher di halaman pembayaran. Saat ini kode INASPORT10 memberi diskon 10%, maksimal Rp15.000." },
];

export default function Home() {
  return (
    <>
      <HeroCarousel />
      <div className="px-4">
        <VenueBrowser />
      </div>

      <section aria-labelledby="steps-title" className="mx-auto mt-24 max-w-6xl px-4">
        <p className={`${eyebrow} text-victory`}>Cara booking</p>
        <h2 id="steps-title" className="mt-2 text-2xl font-bold text-primary sm:text-3xl">Tiga langkah ke lapangan</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.t} className="rounded-2xl bg-muted p-6">
              <span className="text-sm font-bold text-victory tabular-nums">0{i + 1}</span>
              <h3 className="mt-2 font-semibold text-primary">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="why-title" className="mx-auto mt-24 max-w-6xl px-4">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center">
          <div>
            <p className={`${eyebrow} text-victory`}>Kenapa booking di sini</p>
            <h2 id="why-title" className="mt-2 text-2xl font-bold text-primary text-balance sm:text-3xl">Lapangan resmi, jadwal jelas, bayar gampang.</h2>
            <p className="mt-3 text-muted-foreground">Semua venue dikelola langsung oleh INA Sports. Kamu lihat jam yang benar-benar kosong, bayar dengan cara yang biasa kamu pakai, dan simpan bukti booking di satu tempat.</p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {BENEFITS.map(({ icon: Icon, t, d }) => (
              <li key={t} className="flex gap-4 rounded-2xl border p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Icon className="size-5" aria-hidden /></span>
                <span>
                  <span className="block font-semibold text-primary">{t}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-10 rounded-2xl bg-muted p-5 sm:flex sm:items-center sm:gap-6">
          <p className="shrink-0 text-sm font-semibold text-primary">Metode pembayaran</p>
          <ul className="mt-3 flex flex-wrap gap-2 sm:mt-0" aria-label="Metode pembayaran yang didukung">
            {PAYMENTS.map((p) => (
              <li key={p}><Badge variant="outline" className="h-7 bg-background px-3 text-sm">{p}</Badge></li>
            ))}
          </ul>
        </div>
      </section>

      <section id="faq" aria-labelledby="faq-title" className="mx-auto mt-24 max-w-3xl scroll-mt-20 px-4">
        <p className={`${eyebrow} text-center text-victory`}>FAQ</p>
        <h2 id="faq-title" className="mt-2 text-center text-2xl font-bold text-primary sm:text-3xl">Pertanyaan yang sering ditanya</h2>
        <Accordion type="single" collapsible className="mt-8 rounded-2xl border px-5">
          {FAQ.map((f, i) => (
            <AccordionItem key={f.q} value={`q${i}`}>
              <AccordionTrigger className="py-4 text-base font-semibold text-primary hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="pb-4 text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section aria-labelledby="cta-title" className="mx-auto mt-24 max-w-6xl px-4">
        <div className="relative isolate overflow-hidden rounded-3xl bg-integrity-deep px-6 py-14 text-center text-white sm:px-12">
          <Image src="/images/venues/gor_03.webp" alt="" fill sizes="(min-width: 1152px) 1120px, 100vw" className="-z-10 object-cover opacity-30" />
          <h2 id="cta-title" className="text-2xl font-bold text-balance sm:text-4xl">Siap turun ke lapangan?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">Cek jam kosong hari ini dan amankan slotmu sebelum diambil orang lain.</p>
          <Link href="/#venue" className={buttonVariants({ variant: "cta", size: "lg", className: "mt-8" })}>Cari lapangan sekarang</Link>
        </div>
      </section>
    </>
  );
}
