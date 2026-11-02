import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { getSite } from "@/lib/site";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return {
    title: { default: `${site.brand.displayName} — Agendamento online`, template: `%s · ${site.brand.displayName}` },
    description: site.brand.tagline || `Agende seu horário com ${site.brand.displayName}.`,
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#faf6f3" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const site = await getSite();
  return (
    <html lang="pt-BR" className={`${inter.variable} ${playfair.variable}`} style={{ ["--brand" as string]: site.brand.primaryColor }}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
