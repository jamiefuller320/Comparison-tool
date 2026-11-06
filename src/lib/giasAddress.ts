/**
 * GIAS placeholder tokens. Edubase stores a single-letter "z" (and a few
 * other nulls) for missing address parts. Keep this set aligned with
 * scripts/gias_address.py.
 */

const GIAS_NULL_TOKENS = new Set([
  "z",
  "na",
  "n/a",
  "n.a",
  "n.a.",
  "none",
  "null",
  "nil",
  "-",
  "—",
  ".",
  "not applicable",
  "not recorded",
  "does not apply",
  "not available",
]);

export function isGiasNullToken(value: string | null | undefined): boolean {
  if (!value) return false;
  return GIAS_NULL_TOKENS.has(value.trim().toLowerCase());
}

/** Drop null segments from a comma-joined address. */
export function stripGiasAddress(
  address: string | null | undefined,
): string | null {
  if (!address) return null;
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && !isGiasNullToken(part));
  return parts.length ? parts.join(", ") : null;
}

/** Clear a town, postcode, or telephone that is only a null token. */
export function stripGiasToken(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const text = value.trim();
  if (!text || isGiasNullToken(text)) return null;
  return text;
}

export function addressHasGiasPlaceholder(
  address: string | null | undefined,
): boolean {
  if (!address) return false;
  return address.split(",").some((part) => isGiasNullToken(part.trim()));
}
