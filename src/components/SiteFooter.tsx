import { BRAND_DOMAIN, BRAND_HOME_URL, BRAND_NAME } from "@/lib/brand";
import { COVERAGE_REGION_LABEL } from "@/lib/laPacks";

const FOOTER_LINKS = [
  { href: "#top", label: "Home" },
  { href: "#nearby", label: "Near home" },
  { href: "#compare", label: "Shortlist" },
  { href: "#side-by-side", label: "Side by side" },
  { href: "#how", label: "How to read" },
  { href: "#data", label: "Data" },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="shell site-footer-inner">
        <div className="site-footer-brand">
          <a href="#top" className="site-footer-name">
            {BRAND_NAME}
          </a>
          <p>
            Parental school compare for {COVERAGE_REGION_LABEL} — shortlist
            nearby schools and early years, compare published figures and
            Ofsted/ISI excerpts, then print a visit pack.
          </p>
        </div>
        <nav className="site-footer-nav" aria-label="Footer">
          <p className="site-footer-nav-label">On this page</p>
          <ul>
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="site-footer-meta">
          <a href={BRAND_HOME_URL}>{BRAND_DOMAIN}</a>
          {" · "}
          Not a league table — patterns to visit on, not a final verdict.
        </p>
      </div>
    </footer>
  );
}
