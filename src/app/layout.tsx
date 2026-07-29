import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { UiPreferencesProvider } from "@/components/UiPreferencesProvider";

export const metadata: Metadata = {
  title: "Schoolside — compare English schools for parental choice",
  description:
    "Side-by-side Key Stage 2 performance comparison for any set of English schools, built for parents choosing a school.",
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
          <SiteHeader />
          {children}
        </UiPreferencesProvider>
      </body>
    </html>
  );
}
