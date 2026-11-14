import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Booking Lapangan · INA Sports", template: "%s · INA Sports" },
  description: "Pesan lapangan tenis, bulu tangkis, dan GOR milik INA Sports di Senayan dan Cibubur.",
};

// Site chrome (header/footer) lives in (site)/layout.tsx so /preview can render without it.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${dmSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
