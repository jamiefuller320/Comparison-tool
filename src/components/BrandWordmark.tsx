/** Inline compass dial used as the “o” in Compass. */

export function CompassO({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className ? `compass-o ${className}` : "compass-o"}
      viewBox="0 0 32 32"
      width="1em"
      height="1em"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="16"
        cy="16"
        r="13"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
      />
      <circle cx="16" cy="16" r="1.8" fill="currentColor" />
      <path d="M16 5.5 L18.2 16 L16 26.5 L13.8 16 Z" fill="currentColor" />
      <path
        d="M5.5 16 L16 13.8 L26.5 16 L16 18.2 Z"
        fill="currentColor"
        opacity="0.72"
      />
    </svg>
  );
}

/** “School Compass” with the compass-style o. */
export function BrandWordmark({
  className = "brand",
  as: Tag = "span",
}: {
  className?: string;
  as?: "span" | "p" | "div";
}) {
  return (
    <Tag className={className}>
      School{" "}
      <span className="brand-compass">
        C<CompassO />
        mpass
      </span>
    </Tag>
  );
}
