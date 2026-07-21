import type { SchoolsIndex } from "@/lib/types";

/** Resolve data URLs for both local and GitHub Pages basePath. */
export function dataUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${base}${clean}`;
}

export async function loadSchoolsIndex(
  fetchImpl: typeof fetch = fetch,
): Promise<SchoolsIndex> {
  const res = await fetchImpl(dataUrl("/data/schools-index.json"));
  if (!res.ok) {
    throw new Error(`Failed to load school index (${res.status})`);
  }
  return res.json() as Promise<SchoolsIndex>;
}
