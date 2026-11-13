import { HeroCarousel } from "@/components/HeroCarousel";
import { VenueBrowser } from "@/components/VenueBrowser";
import { eyebrow } from "@/components/ui";

const STEPS = [
  { t: "Pilih venue & jadwal", d: "Tentukan lapangan, tanggal, dan jam yang masih kosong." },
  { t: "Isi data & bayar", d: "Bayar lewat QRIS, e-wallet, virtual account, atau kartu." },
  { t: "Datang & main", d: "Tunjukkan kode booking di meja venue 15 menit sebelum mulai." },
];

export default function Home() {
  return (
    <>
      <HeroCarousel />
      <div className="px-4">
        <VenueBrowser />
      </div>

      <section className="mx-auto mt-20 max-w-6xl px-4">
        <p className={`${eyebrow} text-victory`}>Cara booking</p>
        <h2 className="mt-2 text-2xl font-bold text-integrity sm:text-3xl">Tiga langkah ke lapangan</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.t} className="rounded-2xl bg-platinum p-6">
              <span className="text-sm font-bold text-victory tabular-nums">0{i + 1}</span>
              <h3 className="mt-2 font-semibold text-integrity">{s.t}</h3>
              <p className="mt-1 text-sm text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
