import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { UiPreferencesProvider } from "@/components/UiPreferencesProvider";
import { AccountProvider } from "@/components/AccountProvider";
import { BRAND_DOMAIN, BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${BRAND_NAME} — shortlist and compare schools before you visit`,
  description: `${BRAND_TAGLINE} Hampshire and the South East. ${BRAND_DOMAIN}`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body>
        <UiPreferencesProvider>
          <AccountProvider>
            <SiteHeader />
            {children}
          </AccountProvider>
        </UiPreferencesProvider>
      </body>
    </html>
  );
}
