/**
 * Client-side lookup for schools with budgeted SEO landing pages.
 */

let cached: Set<string> | null = null;
let loading: Promise<Set<string>> | null = null;

export function schoolSeoPath(urn: string): string {
  return `/schools/${encodeURIComponent(String(urn))}/`;
}

/** Lazy-load the URN set from the generated manifest. */
export function loadSeoUrns(): Promise<Set<string>> {
  if (cached) return Promise.resolve(cached);
  if (loading) return loading;
  loading = fetch("/data/seo-urns.json")
    .then((res) => (res.ok ? res.json() : { urns: [] }))
    .then((data: { urns?: string[] }) => {
      cached = new Set((data.urns ?? []).map(String));
      return cached;
    })
    .catch(() => {
      cached = new Set();
      return cached;
    });
  return loading;
}
