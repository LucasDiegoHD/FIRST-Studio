import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
    "Minimalist FRC architecture studio generating compile-ready Ciprix & WPILib projects.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-black text-[#f3f5f8] font-sans antialiased selection:bg-[#142c4f] selection:text-white">
        {children}
      </body>
    </html>
  );
}
