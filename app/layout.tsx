import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meinoberdorf - Agartha wartet auf dich",
  description: "Lars welch und Angreboda schmiedeten diese Seite. Mach sie auf!",
};

import localFont from "next/font/local";
const iosevka = localFont({
  src: [
    {
      path: "./fonts/IosevkaNerdFont-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/IosevkaNerdFont-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-iosevka",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={iosevka.variable}>
    <body className="min-h-screen flex flex-col">
    <main className="flex-1">{children}</main>
  <footer className="mx-5 border-t border-stone-500 mt-10 py-4 text-center text-sm text-stone-400">
  © {new Date().getFullYear()} <i>Stro2013del14</i> — All rights reserved.
    </footer>
    </body>


</html>
  );
}

