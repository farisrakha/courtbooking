import Image from "next/image";

export function Footer() {
  return (
    <footer className="mt-20 bg-integrity-deep text-white/80 print:hidden">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[1fr_auto]">
        <div>
          <Image src="/brand/logo-light.svg" alt="INA Sports" width={128} height={29} />
          <p className="mt-4 max-w-md text-sm leading-relaxed">
            Cari lapangan, pilih jadwal, dan kembali bermain. Venue olahraga milik negara di Senayan dan Cibubur.
          </p>
        </div>
        <div className="text-sm sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">Dikelola oleh</p>
          <p className="mt-1 font-semibold text-white">LPUK Kemenpora RI</p>
          <p className="mt-3">info@inasports.id</p>
        </div>
      </div>
      <p className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/60">
        © 2026 Lembaga Pengelola Usaha Keolahragaan, Kementerian Pemuda dan Olahraga Republik Indonesia
      </p>
    </footer>
  );
}
