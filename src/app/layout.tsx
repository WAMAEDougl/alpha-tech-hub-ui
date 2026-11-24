import type { Metadata } from "next";
import { Manrope, Newsreader, Rajdhani, Space_Grotesk } from "next/font/google";
import "@/index.css";
import Providers from "./providers";

// Fonts are downloaded at build time and served from this site: no render-blocking request to Google.
const rajdhani = Rajdhani({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-rajdhani", display: "swap" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-space-grotesk", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], axes: ["opsz"], variable: "--font-newsreader", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://alphacomputersnanyuki.co.ke";
const TITLE = "Alpha Computers Nanyuki | Laptops, Desktops & Computer Repairs in Nanyuki, Kenya";
const DESCRIPTION =
  "Alpha Computers Nanyuki — your trusted technology hub in Nanyuki, Kenya. Shop laptops, desktops, accessories and networking gear. Expert computer repairs, OS installation, data recovery and more.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  keywords: "computer shop Nanyuki, laptops Nanyuki, desktops Kenya, computer repairs Nanyuki, IT services Nanyuki, Alpha Computers, buy laptop Kenya, hardware repair Nanyuki, data recovery Kenya, networking setup Nanyuki",
  authors: [{ name: "Alpha Computers Nanyuki" }],
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  icons: { icon: "/favicon.png.png", apple: "/favicon.png.png" },
  openGraph: {
    type: "website",
    siteName: "Alpha Computers Nanyuki",
    title: "Alpha Computers Nanyuki | Laptops, Desktops & Computer Repairs",
    description: "Shop laptops, desktops, accessories and get expert computer repairs in Nanyuki, Kenya. Quality hardware at competitive prices since 2015.",
    url: "/",
    locale: "en_KE",
    images: [{ url: "/logo-red.png", width: 525, height: 543 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Alpha Computers Nanyuki | Laptops, Desktops & Computer Repairs",
    description: "Your trusted technology hub in Nanyuki, Kenya. Quality hardware, expert repairs, and unmatched service since 2015.",
    images: ["/logo-red.png"],
  },
  other: {
    "geo.region": "KE-700",
    "geo.placename": "Nanyuki, Laikipia County, Kenya",
    "geo.position": "-0.0167;37.0667",
    ICBM: "-0.0167, 37.0667",
  },
};

const localBusiness = {
  "@context": "https://schema.org",
  "@type": "ComputerStore",
  name: "Alpha Computers Nanyuki",
  description: "Your trusted technology hub in Nanyuki, Kenya. Quality hardware, expert repairs, and unmatched service since 2015.",
  url: SITE,
  logo: `${SITE}/logo-red.png`,
  image: `${SITE}/logo-red.png`,
  telephone: "+254700000000",
  priceRange: "KES",
  currenciesAccepted: "KES",
  paymentAccepted: "Cash, M-Pesa",
  address: { "@type": "PostalAddress", streetAddress: "Kenyatta Avenue", addressLocality: "Nanyuki", addressRegion: "Laikipia County", addressCountry: "KE" },
  geo: { "@type": "GeoCoordinates", latitude: -0.0167, longitude: 37.0667 },
  openingHoursSpecification: [
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "08:00", closes: "18:00" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "09:00", closes: "16:00" },
  ],
  sameAs: ["https://wa.me/254700000000"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the theme switcher adds its class to <html> before React loads
    <html lang="en" suppressHydrationWarning className={`${rajdhani.variable} ${spaceGrotesk.variable} ${newsreader.variable} ${manrope.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
