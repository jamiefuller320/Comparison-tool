import Link from "next/link";
import { areasIndexPath } from "@/lib/areas";
import { BRAND_DOMAIN, BRAND_HOME_URL, BRAND_NAME } from "@/lib/brand";
import { guidePath, guidesIndexPath } from "@/lib/guides";
import { COVERAGE_REGION_LABEL } from "@/lib/laPacks";

const TOOL_LINKS = [
  { href: "/#top", label: "Compare" },
  { href: "/#nearby", label: "Find" },
  { href: "/#compare", label: "Shortlist" },
  { href: "/#side-by-side", label: "Side by side" },
  { href: "/#areas", label: "Areas" },
  { href: "/#how", label: "Understand" },
  { href: "/#data", label: "Data" },
] as const;

const AREA_HIGHLIGHTS = [
  { href: "/areas/hampshire/", label: "Hampshire" },
  { href: "/areas/kent/", label: "Kent" },
  { href: "/areas/surrey/", label: "Surrey" },
  { href: "/areas/oxfordshire/", label: "Oxfordshire" },
  { href: "/areas/west-sussex/", label: "West Sussex" },
  { href: "/areas/southampton/", label: "Southampton" },
] as const;

const GUIDE_LINKS = [
  { href: guidePath("how-to-read"), label: "How to read figures" },
  { href: guidePath("primary-ks2"), label: "Primary KS2" },
  { href: guidePath("secondary-ks4"), label: "Secondary KS4" },
  { href: guidePath("early-years"), label: "Early years" },
  { href: guidePath("faq"), label: "FAQ" },
  { href: guidesIndexPath(), label: "All guides" },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="shell site-footer-inner">
        <div className="site-footer-brand">
          <Link href="/" className="site-footer-name">
            {BRAND_NAME}
          </Link>
          <p>
            Parental school compare for {COVERAGE_REGION_LABEL} — shortlist
            nearby schools and early years, compare published figures and
            Ofsted/ISI excerpts, then print a visit pack.
          </p>
        </div>
        <nav className="site-footer-nav" aria-label="Compare tool">
          <p className="site-footer-nav-label">Compare tool</p>
          <ul>
            {TOOL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav className="site-footer-nav site-footer-areas" aria-label="Areas">
          <p className="site-footer-nav-label">Areas</p>
          <ul>
            {AREA_HIGHLIGHTS.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
            <li>
              <Link href={areasIndexPath()}>All covered areas</Link>
            </li>
          </ul>
        </nav>
        <nav className="site-footer-nav" aria-label="Guides">
          <p className="site-footer-nav-label">Guides</p>
          <ul>
            {GUIDE_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="site-footer-meta">
          <a href={`${BRAND_HOME_URL}/`}>{BRAND_DOMAIN}</a>
          {" · "}
          Not a league table — patterns to visit on, not a final verdict.
        </p>
      </div>
    </footer>
  );
}
