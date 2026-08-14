/** Inline compass dial used as the “o” in Compass — NE-pointing, letter-sized. */

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
      {/* Outer ring sized like a Fraunces o counter. */}
      <circle
        cx="16"
        cy="16"
        r="12.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
      />
      {/* Needles rotated 45° so the bright axis points north-east. */}
      <g transform="rotate(45 16 16)">
        <path d="M16 4.8 L18.35 16 L16 27.2 L13.65 16 Z" fill="currentColor" />
        <path
          d="M4.8 16 L16 13.65 L27.2 16 L16 18.35 Z"
          fill="currentColor"
          opacity="0.78"
        />
      </g>
      <circle cx="16" cy="16" r="1.55" fill="currentColor" />
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
