import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-barlow-condensed",
});

export const metadata: Metadata = {
  title: { default: "GoBhora", template: "%s | GoBhora" },
  description:
    "Tables, results, fixtures and player stats for Zimbabwe's football leagues.",
};

export const viewport: Viewport = {
  themeColor: "#12102b",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${barlowCondensed.variable}`}
    >
      <body className="min-h-dvh bg-surface font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
