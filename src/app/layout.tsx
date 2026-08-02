import type { Metadata, Viewport } from "next";
import "./globals.css";
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

export const metadata: Metadata = {
  metadataBase: new URL(BRAND_HOME_URL),
  title: {
    default: SEO_TITLE,
    template: SEO_TITLE_TEMPLATE,
  },
  description: SEO_DESCRIPTION,
  applicationName: BRAND_NAME,
  keywords: [...SEO_KEYWORDS],
  authors: [{ name: BRAND_NAME, url: BRAND_HOME_URL }],
  creator: BRAND_NAME,
  publisher: BRAND_NAME,
  category: "education",
  alternates: {
    canonical: "/",
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
    url: BRAND_HOME_URL,
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
    <html lang="en-GB">
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
      </body>
    </html>
  );
}
