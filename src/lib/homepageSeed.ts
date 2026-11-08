/**
 * The homepage must not download the Hampshire seed (schools, early years,
 * childminders) until a postcode is entered. A URL that already carries a
 * postcode or a shared shortlist is treated as that entry.
 */
export function homepageSearchNeedsSeed(search: string): boolean {
  const params = new URLSearchParams(search);
  const postcode = (params.get("postcode") || params.get("home") || "").trim();
  const share = (params.get("schools") || params.get("urns") || "").trim();
  return Boolean(postcode || share);
}
