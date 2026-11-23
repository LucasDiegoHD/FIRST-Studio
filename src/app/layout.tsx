import type { Metadata } from "next";
import { JetBrains_Mono, Source_Sans_3 } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-source-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FIRST Studio — Ciprix FRC Generator",
  description:
    "Interactive FRC robot architecture studio generating compile-ready Ciprix & WPILib projects.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`dark ${sourceSans.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-black text-[#f3f5f8] font-sans antialiased selection:bg-[#142c4f] selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
