// Venue catalog. Photos come from inasports.vercel.app (public/images/venues).
// ponytail: static data, move to a database when LPUK manages venues from an admin.
// Tariffs follow the Pedoman Tarif Layanan BLU LPUK 2026 where the revision brief gives a number;
// everything marked "placeholder" is a guess until the Kepdirut LPUK document arrives.

/** Price of one retail block (2 hours, or one visit). */
export type Tariff = {
  weekday: number; // also the "Perorangan" and "Non-Peak" price
  weekend?: number; // Sabtu–Minggu
  peak?: number; // from venue.peakFrom
  club?: number; // "Sewa Klub" (Aquatic, Panahan)
};
export type Court = { id: string; name: string; surface: string; tariff: Tariff };

/** Event and Tribun rent the whole venue for a day. */
export type Package = { id: string; type: "Event" | "Tribun"; label: string; hours: 12 | 16; price: number };

/** UI-08 Mezzanine rooms: "jam" rooms are rented per hour on working days, "hari" rooms per whole day. */
export type Room = { id: string; name: string; unit: "jam" | "hari"; price: number; area: number; capacity: number };

export type Venue = {
  slug: string;
  name: string;
  sport?: Sport; // none for room-only venues
  location: Location;
  address: string;
  images: string[];
  open: number; // first bookable hour (24h)
  close: number; // closing hour
  block: 2 | "visit"; // retail unit: 2-hour blocks, or one day pass per visit
  peakFrom?: number; // blocks starting at or after this hour use tariff.peak
  maxPlayers: number;
  description: string;
  amenities: string[];
  courts: Court[];
  packages?: Package[];
  rooms?: Room[];
  comingSoon?: boolean;
};

export const SPORTS = ["Tenis", "Bulu Tangkis", "Futsal & Basket", "Aquatic", "Panahan", "Panjat Tebing", "Mini Soccer"] as const;
export type Sport = (typeof SPORTS)[number];
export const LOCATIONS = ["Senayan", "Cibubur"] as const;
export type Location = (typeof LOCATIONS)[number];
export const RENTAL_TYPES = ["Retail", "Event", "Tribun", "Ruangan"] as const;
export type RentalType = (typeof RENTAL_TYPES)[number];

const img = (...names: string[]) => names.map((n) => `/images/venues/${n}.webp`);

export const VENUES: Venue[] = [
  {
    slug: "tenis-senayan",
    name: "Lapangan Tenis Senayan",
    sport: "Tenis",
    location: "Senayan",
    address: "Kawasan Gelora Bung Karno, Senayan, Jakarta Pusat",
    images: img("tennis_01", "tennis_02", "tennis_03", "tennis_04"),
    open: 6,
    close: 22,
    block: 2,
    maxPlayers: 4,
    description:
      "Lapangan tenis outdoor berstandar kompetisi dengan pencahayaan malam, cocok untuk latihan rutin maupun pertandingan persahabatan.",
    amenities: ["Lampu malam", "Parkir", "Ruang ganti", "Kantin"],
    // ponytail: placeholder tariff, replace with Kepdirut LPUK 2026 (brief only says weekday ≠ weekend).
    courts: [
      { id: "t1", name: "Lapangan 1", surface: "Hard court", tariff: { weekday: 300_000, weekend: 350_000 } },
      { id: "t2", name: "Lapangan 2", surface: "Hard court", tariff: { weekday: 300_000, weekend: 350_000 } },
      { id: "t3", name: "Lapangan 3", surface: "Clay court", tariff: { weekday: 350_000, weekend: 400_000 } },
    ],
  },
  {
    slug: "bulu-tangkis-senayan",
    name: "Lapangan Bulu Tangkis Senayan",
    sport: "Bulu Tangkis",
    location: "Senayan",
    address: "Kawasan Gelora Bung Karno, Senayan, Jakarta Pusat",
    images: img("badminton_01", "badminton_02", "badminton_03"),
    open: 7,
    close: 23,
    block: 2,
    maxPlayers: 4,
    description:
      "Hall bulu tangkis indoor dengan lantai karpet vinyl dan plafon tinggi, nyaman untuk smash dan rally panjang.",
    amenities: ["Indoor", "Parkir", "Ruang ganti", "Musala"],
    // ponytail: placeholder tariff, replace with Kepdirut LPUK 2026.
    courts: ["A", "B", "C", "D"].map((x, i) => ({
      id: `b${i + 1}`, name: `Lapangan ${x}`, surface: "Karpet vinyl", tariff: { weekday: 120_000, weekend: 150_000 },
    })),
  },
  {
    slug: "gor-popki-cibubur",
    name: "GOR POPKI Cibubur",
    sport: "Futsal & Basket",
    location: "Cibubur",
    address: "Kawasan Olahraga Cibubur, Jakarta Timur",
    images: img("gor_01", "gor_02", "gor_03", "gor_04", "gor_05"),
    open: 6,
    close: 22,
    block: 2,
    peakFrom: 16, // ponytail: placeholder peak window, brief gives prices only
    maxPlayers: 20,
    description:
      "Gedung olahraga indoor serbaguna dengan tribun sekitar 1.800 kursi. Bisa dipakai untuk futsal, basket, voli, kejuaraan, dan ujian.",
    amenities: ["Indoor", "Tribun 1.800 kursi", "Parkir luas", "Ruang ganti"],
    courts: [
      // Brief: Non-Peak Rp500rb / Peak Rp800rb per 2 jam.
      { id: "g1", name: "Arena Utama", surface: "Lantai parket", tariff: { weekday: 500_000, peak: 800_000 } },
    ],
    packages: [
      { id: "event-16", type: "Event", label: "Paket Event 1 Hari (16 Jam)", hours: 16, price: 12_000_000 }, // brief example
      { id: "tribun-16", type: "Tribun", label: "Paket Sewa Tribun (16 Jam)", hours: 16, price: 6_000_000 }, // ponytail: placeholder
    ],
  },
  {
    slug: "aquatic-cibubur",
    name: "Aquatic Center Cibubur",
    sport: "Aquatic",
    location: "Cibubur",
    address: "Kawasan Olahraga Cibubur, Jakarta Timur",
    images: img("aquatic_01", "aquatic_02", "aquatic_03", "aquatic_04"),
    open: 6,
    close: 20,
    block: 2,
    maxPlayers: 40,
    description:
      "Kolam renang standar kompetisi untuk latihan perorangan, sesi klub, dan kejuaraan renang.",
    amenities: ["Kolam 50 m", "Ruang bilas", "Tribun", "Parkir"],
    // Brief: Perorangan Rp60rb / Klub Rp360rb–750rb per 2 jam (split per pool is a placeholder).
    courts: [
      { id: "a1", name: "Kolam Utama", surface: "50 m, 10 lintasan", tariff: { weekday: 60_000, club: 750_000 } },
      { id: "a2", name: "Kolam Latihan", surface: "25 m, 6 lintasan", tariff: { weekday: 60_000, club: 360_000 } },
    ],
    packages: [
      { id: "event-12", type: "Event", label: "Paket Event 12 Jam", hours: 12, price: 8_000_000 }, // ponytail: placeholder
    ],
  },
  {
    slug: "panahan-cibubur",
    name: "Lapangan Panahan Cibubur",
    sport: "Panahan",
    location: "Cibubur",
    address: "Kawasan Olahraga Cibubur, Jakarta Timur",
    images: img("archery_01", "archery_02", "archery_03"),
    open: 6, // ponytail: placeholder hours, long enough for the 12-hour event package
    close: 18,
    block: 2,
    maxPlayers: 30,
    description: "Lapangan panahan outdoor dengan jarak tembak lengkap untuk latihan, klub, dan kejuaraan.",
    amenities: ["Outdoor", "Jarak 30–70 m", "Gudang alat", "Parkir"],
    courts: [
      // Brief: Perorangan Rp60rb / Klub Rp360rb per 2 jam.
      { id: "p1", name: "Lapangan Panahan", surface: "Rumput, 70 m", tariff: { weekday: 60_000, club: 360_000 } },
    ],
    packages: [
      { id: "event-12", type: "Event", label: "Paket Event 12 Jam", hours: 12, price: 5_000_000 }, // ponytail: placeholder
    ],
  },
  {
    slug: "panjat-tebing-cibubur",
    name: "Wall Climbing Cibubur",
    sport: "Panjat Tebing",
    location: "Cibubur",
    address: "Kawasan Olahraga Cibubur, Jakarta Timur",
    images: img("climb_01", "climb_02", "climb_03"),
    open: 8,
    close: 18,
    block: "visit",
    maxPlayers: 1,
    description: "Dinding panjat tebing untuk latihan lead, speed, dan boulder. Tiket berlaku untuk satu kedatangan per hari.",
    amenities: ["Outdoor", "Lead & speed", "Sewa alat", "Parkir"],
    // ponytail: placeholder tariff, brief says "per kedatangan" without a number.
    courts: [{ id: "w1", name: "Dinding Panjat", surface: "Lead · Speed · Boulder", tariff: { weekday: 50_000 } }],
  },
  {
    slug: "mini-soccer-cibubur",
    name: "Lapangan Mini Soccer Cibubur",
    sport: "Mini Soccer",
    location: "Cibubur",
    address: "Kawasan Olahraga Cibubur, Jakarta Timur",
    images: img("field_01", "field_02", "area_12"),
    open: 6,
    close: 22,
    block: 2,
    maxPlayers: 14,
    description:
      "Lapangan mini soccer rumput sintetis di kawasan olahraga terpadu Cibubur, lengkap dengan jogging track di sekelilingnya.",
    amenities: ["Rumput sintetis", "Jogging track", "Parkir", "Lampu malam"],
    courts: [{ id: "m1", name: "Lapangan Utama", surface: "Rumput sintetis", tariff: { weekday: 700_000 } }],
    comingSoon: true, // matches inasports.vercel.app/id/booking ("Segera hadir")
  },
  {
    slug: "mezzanine-gor-utara",
    name: "Ruangan Mezzanine GOR Utara",
    location: "Senayan", // ponytail: placeholder, confirm where GOR Utara is
    address: "GOR Utara",
    images: img("area_01"),
    open: 8,
    close: 17,
    block: 2,
    maxPlayers: 40,
    description: "Ruang rapat dan ruang kelas di lantai mezzanine GOR Utara untuk pelatihan, rapat, dan ujian.",
    amenities: ["AC", "Proyektor", "Meja & kursi"],
    courts: [],
    // Brief (Lampiran III): Ruang A–C Rp100rb/jam (hari kerja), Ruang Kelas 1–3 Rp7,4–7,53 jt/hari.
    // ponytail: placeholder, Lampiran III. Every m², capacity, and the Ruang D price are guesses.
    rooms: [
      { id: "ra", name: "Ruang A", unit: "jam", price: 100_000, area: 40, capacity: 20 },
      { id: "rb", name: "Ruang B", unit: "jam", price: 100_000, area: 40, capacity: 20 },
      { id: "rc", name: "Ruang C", unit: "jam", price: 100_000, area: 60, capacity: 30 },
      { id: "rd", name: "Ruang D", unit: "hari", price: 3_500_000, area: 120, capacity: 60 },
      { id: "k1", name: "Ruang Kelas 1", unit: "hari", price: 7_400_000, area: 200, capacity: 100 },
      { id: "k2", name: "Ruang Kelas 2", unit: "hari", price: 7_400_000, area: 200, capacity: 100 },
      { id: "k3", name: "Ruang Kelas 3", unit: "hari", price: 7_530_000, area: 220, capacity: 110 },
    ],
  },
];

export const getVenue = (slug: string) => VENUES.find((v) => v.slug === slug);

export function rentalTypes(v: Venue): RentalType[] {
  const t: RentalType[] = [];
  if (v.courts.length) t.push("Retail");
  for (const p of v.packages ?? []) if (!t.includes(p.type)) t.push(p.type);
  if (v.rooms?.length) t.push("Ruangan");
  return t;
}

/** What one bookable unit is called: "Ruangan", "Kolam" for pools, "Tiket" for day passes, else "Lapangan". */
export const unitLabel = (v: Venue) =>
  v.rooms?.length ? "Ruangan" : v.block === "visit" ? "Tiket" : v.sport === "Aquatic" ? "Kolam" : "Lapangan";

/** "Sewa Event & Tribun" from the package types a venue sells (one naming source for tabs and headings). */
export const eventLabel = (v: Venue) => `Sewa ${[...new Set((v.packages ?? []).map((p) => p.type))].join(" & ")}`;

/** Has a "Sewa Klub" tariff (Aquatic, Panahan). */
export const hasClub = (v: Venue) => v.courts.some((c) => c.tariff.club);

/** Cheapest "Mulai" price and its unit for a venue card, in retail or event mode. */
export function fromPrice(v: Venue, mode: "retail" | "event"): { price: number; unit: string } {
  if (mode === "event" && v.packages?.length) {
    const p = v.packages.reduce((a, b) => (b.price < a.price ? b : a));
    return { price: p.price, unit: p.hours === 16 ? "Hari (16 Jam)" : "12 Jam" };
  }
  if (!v.courts.length && v.rooms?.length) {
    const r = v.rooms.reduce((a, b) => (b.price < a.price ? b : a));
    return { price: r.price, unit: r.unit === "jam" ? "Jam" : "Hari" };
  }
  return { price: Math.min(...v.courts.map((c) => c.tariff.weekday)), unit: v.block === "visit" ? "Kedatangan" : "2 Jam" };
}
