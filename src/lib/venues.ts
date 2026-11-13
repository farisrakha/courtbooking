// Venue catalog. Photos come from inasports.vercel.app (public/images/venues).
// ponytail: static data, move to a database when LPUK manages venues from an admin.

export type Court = { id: string; name: string; surface: string; price: number };

export type Venue = {
  slug: string;
  name: string;
  sport: Sport;
  location: Location;
  address: string;
  images: string[];
  open: number; // first bookable hour (24h)
  close: number; // closing hour; last slot starts at close - 1
  maxPlayers: number;
  description: string;
  amenities: string[];
  courts: Court[];
  comingSoon?: boolean;
};

export const SPORTS = ["Tenis", "Bulu Tangkis", "Futsal & Basket", "Mini Soccer"] as const;
export type Sport = (typeof SPORTS)[number];
export const LOCATIONS = ["Senayan", "Cibubur"] as const;
export type Location = (typeof LOCATIONS)[number];

const img = (...names: string[]) => names.map((n) => `/images/venues/${n}.webp`);

// ponytail: placeholder rates, replace with the official LPUK tariff.
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
    maxPlayers: 4,
    description:
      "Lapangan tenis outdoor berstandar kompetisi dengan pencahayaan malam, cocok untuk latihan rutin maupun pertandingan persahabatan.",
    amenities: ["Lampu malam", "Parkir", "Ruang ganti", "Kantin"],
    courts: [
      { id: "t1", name: "Lapangan 1", surface: "Hard court", price: 150_000 },
      { id: "t2", name: "Lapangan 2", surface: "Hard court", price: 150_000 },
      { id: "t3", name: "Lapangan 3", surface: "Clay court", price: 175_000 },
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
    maxPlayers: 4,
    description:
      "Hall bulu tangkis indoor dengan lantai karpet vinyl dan plafon tinggi, nyaman untuk smash dan rally panjang.",
    amenities: ["Indoor", "Parkir", "Ruang ganti", "Musala"],
    courts: [
      { id: "b1", name: "Lapangan A", surface: "Karpet vinyl", price: 60_000 },
      { id: "b2", name: "Lapangan B", surface: "Karpet vinyl", price: 60_000 },
      { id: "b3", name: "Lapangan C", surface: "Karpet vinyl", price: 60_000 },
      { id: "b4", name: "Lapangan D", surface: "Karpet vinyl", price: 60_000 },
    ],
  },
  {
    slug: "gor-popki-cibubur",
    name: "GOR POPKI Cibubur",
    sport: "Futsal & Basket",
    location: "Cibubur",
    address: "Kawasan Olahraga Cibubur, Jakarta Timur",
    images: img("gor_01", "gor_02", "gor_03", "gor_04", "gor_05"),
    open: 7,
    close: 22,
    maxPlayers: 20,
    description:
      "Gedung olahraga indoor serbaguna dengan tribun sekitar 1.800 kursi. Bisa dipakai untuk futsal, basket, dan voli.",
    amenities: ["Indoor", "Tribun 1.800 kursi", "Parkir luas", "Ruang ganti"],
    courts: [
      { id: "g1", name: "Arena Utama", surface: "Lantai parket", price: 450_000 },
      { id: "g2", name: "Lapangan Latihan", surface: "Lantai vinyl", price: 250_000 },
    ],
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
    maxPlayers: 14,
    description:
      "Lapangan mini soccer rumput sintetis di kawasan olahraga terpadu Cibubur, lengkap dengan jogging track di sekelilingnya.",
    amenities: ["Rumput sintetis", "Jogging track", "Parkir", "Lampu malam"],
    courts: [{ id: "m1", name: "Lapangan Utama", surface: "Rumput sintetis", price: 350_000 }],
    comingSoon: true, // matches inasports.vercel.app/id/booking ("Segera hadir")
  },
];

export const getVenue = (slug: string) => VENUES.find((v) => v.slug === slug);
export const minPrice = (v: Venue) => Math.min(...v.courts.map((c) => c.price));
