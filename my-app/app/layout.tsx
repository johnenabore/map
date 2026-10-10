import type { Metadata } from "next";
import { Cinzel, Cormorant_Garamond, Geist, IM_Fell_English_SC, Open_Sans } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const fell = IM_Fell_English_SC({
  variable: "--font-fell",
  subsets: ["latin"],
  weight: "400",
});

// The discovery drawer: serif caps for headings and links, a light italic sans for the quote.
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600"],
  preload: false, // not on the first screen (drawers, navbar ruler): fetched when first used
});

const openSans = Open_Sans({
  variable: "--font-opensans",
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  preload: false, // only the drawer's quote
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Protheka",
  description: "Map of Protheka",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="night"
      className={`${geistSans.variable} ${cinzel.variable} ${fell.variable} ${cormorant.variable} ${openSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
