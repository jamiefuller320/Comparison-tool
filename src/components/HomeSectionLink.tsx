"use client";

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import {
  homeSectionHref,
  isHomePath,
  scrollToHomeSection,
} from "@/lib/inPageNav";

/** Link to a homepage section; keeps shortlist query params when already home. */
export function HomeSectionLink({
  hash,
  children,
  className,
  onNavigate,
  ...rest
}: {
  hash: string;
  children: ReactNode;
  className?: string;
  onNavigate?: () => void;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick">) {
  const clean = hash.replace(/^#/, "");
  return (
    <a
      {...rest}
      className={className}
      href={homeSectionHref(clean)}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        if (isHomePath()) {
          e.preventDefault();
          scrollToHomeSection(clean);
        }
        onNavigate?.();
      }}
    >
      {children}
    </a>
  );
}
