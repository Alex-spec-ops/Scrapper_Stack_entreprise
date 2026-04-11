import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import OfflineDetector from "./components/OfflineDetector";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SkillHunt — Trouvez les entreprises qui recrutent vos compétences",
  description:
    "Scrapez en temps réel Indeed, Welcome to the Jungle, APEC, France Travail et Jobteaser pour trouver les entreprises qui utilisent vos compétences.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <OfflineDetector />
        {children}
      </body>
    </html>
  );
}
