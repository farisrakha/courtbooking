import Image from "next/image";
import Link from "next/link";

const COLUMNS = [
  { title: "Jelajahi", links: [["Cari Lapangan", "/#venue"], ["Booking Saya", "/bookings"], ["FAQ", "/#faq"]] },
  { title: "Akun", links: [["Masuk", "/masuk"], ["Daftar", "/daftar"]] },
] as const;

export function Footer() {
  return (
    <footer className="mt-20 bg-integrity-deep text-white/80 print:hidden">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.2fr]">
        <div>
          <Image src="/brand/logo-light.svg" alt="INA Sports" width={128} height={29} />
          <p className="mt-4 max-w-sm text-sm leading-relaxed">
            Cari lapangan, pilih jadwal, dan kembali bermain. Venue olahraga milik negara di Senayan dan Cibubur.
          </p>
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">{c.title}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {c.links.map(([t, href]) => (
                <li key={href}><Link href={href} className="hover:text-white hover:underline">{t}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
        <div className="text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">Dikelola oleh</p>
          <p className="mt-3 font-semibold text-white">LPUK Kemenpora RI</p>
          <a href="mailto:info@inasports.id" className="mt-2 inline-block hover:text-white hover:underline">info@inasports.id</a>
        </div>
      </div>
      <p className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/60">
        © 2026 Lembaga Pengelola Usaha Keolahragaan, Kementerian Pemuda dan Olahraga Republik Indonesia
      </p>
    </footer>
  );
}
