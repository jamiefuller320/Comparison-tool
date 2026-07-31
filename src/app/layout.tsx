import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { UiPreferencesProvider } from "@/components/UiPreferencesProvider";

export const metadata: Metadata = {
  title: "Schoolside — South East school compare for parents",
  description:
    "Side-by-side school and early-years comparison across Hampshire and the wider South East (including Dorset) — published outcomes, Ofsted/ISI excerpts, and a shortlist visit pack.",
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
