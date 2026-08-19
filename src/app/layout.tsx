import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import "./globals.css";
import { Analytics } from "@/components/Analytics";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { JsonLd } from "@/components/JsonLd";
import { UiPreferencesProvider } from "@/components/UiPreferencesProvider";
import { AccountProvider } from "@/components/AccountProvider";
import { BRAND_HOME_URL, BRAND_NAME } from "@/lib/brand";
import {
  SEO_DESCRIPTION,
  SEO_KEYWORDS,
  SEO_TITLE,
  SEO_TITLE_TEMPLATE,
  websiteJsonLd,
} from "@/lib/seo";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const googleVerification =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: new URL(BRAND_HOME_URL),
  title: {
    default: SEO_TITLE,
    template: SEO_TITLE_TEMPLATE,
  },
  description: SEO_DESCRIPTION,
  applicationName: BRAND_NAME,
  keywords: [...SEO_KEYWORDS],
  authors: [{ name: BRAND_NAME, url: `${BRAND_HOME_URL}/` }],
  creator: BRAND_NAME,
  publisher: BRAND_NAME,
  category: "education",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    // Match <link rel="canonical"> — trailing slash is the indexed homepage.
    url: `${BRAND_HOME_URL}/`,
    siteName: BRAND_NAME,
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: `${BRAND_NAME} — compare nearby schools before you visit`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    images: ["/og.png"],
  },
  other: {
    "geo.region": "GB",
  },
  ...(googleVerification
    ? { verification: { google: googleVerification } }
    : {}),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b4f6c" },
    { media: "(prefers-color-scheme: dark)", color: "#073a50" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" className={`${figtree.variable} ${fraunces.variable}`}>
      <body>
        <JsonLd data={websiteJsonLd()} />
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <UiPreferencesProvider>
          <AccountProvider>
            <SiteHeader />
            {children}
            <SiteFooter />
          </AccountProvider>
        </UiPreferencesProvider>
        <Analytics />
      </body>
    </html>
  );
}
