import type { Metadata } from "next";
import "./globals.css";

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
        <header className="site-header">
          <div className="shell header-inner">
            <a className="brand" href="#top">
              School<span>side</span>
            </a>
            <nav className="nav-links" aria-label="Primary">
              <a href="#compare">Compare</a>
              <a href="#how">How to read this</a>
              <a href="#data">Data</a>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
