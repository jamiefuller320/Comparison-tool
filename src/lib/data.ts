import { fetchWithRetry } from "@/lib/resilientFetch";
import type {
  ChildmindersIndex,
  EyProvidersIndex,
  SchoolsIndex,
} from "@/lib/types";

/** Resolve data URLs for both local and GitHub Pages basePath. */
export function dataUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${base}${clean}`;
}

function cacheInit(cacheBust: boolean): RequestInit {
  return { cache: cacheBust ? "no-store" : "default" };
}

function bust(url: string, cacheBust: boolean): string {
  return cacheBust ? `${url}?t=${Date.now()}` : url;
}

export async function loadSchoolsIndex(
  fetchImpl: typeof fetch = fetch,
  cacheBust = false,
): Promise<SchoolsIndex> {
  const url = bust(dataUrl("/data/schools-index.json"), cacheBust);
  const res = await fetchWithRetry(url, cacheInit(cacheBust), fetchImpl);
  if (!res.ok) {
    throw new Error(`Failed to load school index (${res.status})`);
  }
  return res.json() as Promise<SchoolsIndex>;
}

export async function loadLaPackManifest(
  fetchImpl: typeof fetch = fetch,
  cacheBust = false,
): Promise<import("@/lib/laPacks").LaPackManifest | null> {
  const url = bust(dataUrl("/data/packs/manifest.json"), cacheBust);
  try {
    const res = await fetchWithRetry(url, cacheInit(cacheBust), fetchImpl);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as import("@/lib/laPacks").LaPackManifest;
  } catch {
    return null;
  }
}

export interface PackUrnLookup {
  generatedAt?: string;
  urnCount?: number;
  byUrn: Record<string, string>;
}

/** URN → pack slug map for geo-lazy share-link resolution. */
export async function loadPackUrnLookup(
  fetchImpl: typeof fetch = fetch,
  cacheBust = false,
): Promise<PackUrnLookup | null> {
  const url = bust(dataUrl("/data/packs/urn-lookup.json"), cacheBust);
  try {
    const res = await fetchWithRetry(url, cacheInit(cacheBust), fetchImpl);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const data = (await res.json()) as PackUrnLookup;
    if (!data?.byUrn || typeof data.byUrn !== "object") return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Soft-fail pack loaders: a missing or flaky pack must never blank the app.
 * Retries transient errors, then returns null.
 */
export async function loadLaPackSchoolsIndex(
  slug: string,
  fetchImpl: typeof fetch = fetch,
  cacheBust = false,
): Promise<SchoolsIndex | null> {
  const path = `/data/packs/${slug}/schools-index.json`;
  const url = bust(dataUrl(path), cacheBust);
  try {
    const res = await fetchWithRetry(url, cacheInit(cacheBust), fetchImpl);
    if (!res.ok) return null;
    return (await res.json()) as SchoolsIndex;
  } catch {
    return null;
  }
}

async function loadLaPackJson<T>(
  slug: string,
  file: string,
  fetchImpl: typeof fetch,
  cacheBust: boolean,
): Promise<T | null> {
  const path = `/data/packs/${slug}/${file}`;
  const url = bust(dataUrl(path), cacheBust);
  try {
    const res = await fetchWithRetry(url, cacheInit(cacheBust), fetchImpl);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function loadLaPackEyProvidersIndex(
  slug: string,
  fetchImpl: typeof fetch = fetch,
  cacheBust = false,
): Promise<EyProvidersIndex | null> {
  return loadLaPackJson<EyProvidersIndex>(
    slug,
    "ey-providers-index.json",
    fetchImpl,
    cacheBust,
  );
}

export async function loadLaPackChildmindersIndex(
  slug: string,
  fetchImpl: typeof fetch = fetch,
  cacheBust = false,
): Promise<ChildmindersIndex | null> {
  return loadLaPackJson<ChildmindersIndex>(
    slug,
    "childminders-index.json",
    fetchImpl,
    cacheBust,
  );
}

export async function loadEyProvidersIndex(
  fetchImpl: typeof fetch = fetch,
  cacheBust = false,
): Promise<EyProvidersIndex | null> {
  const url = bust(dataUrl("/data/ey-providers-index.json"), cacheBust);
  try {
    const res = await fetchWithRetry(url, cacheInit(cacheBust), fetchImpl);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json() as Promise<EyProvidersIndex>;
  } catch {
    return null;
  }
}

export async function loadChildmindersIndex(
  fetchImpl: typeof fetch = fetch,
  cacheBust = false,
): Promise<ChildmindersIndex | null> {
  const url = bust(dataUrl("/data/childminders-index.json"), cacheBust);
  try {
    const res = await fetchWithRetry(url, cacheInit(cacheBust), fetchImpl);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json() as Promise<ChildmindersIndex>;
  } catch {
    return null;
  }
}

export interface ForceRefreshState {
  lastForcedAt?: string;
  lastForcedDate?: string;
  school?: string | null;
  triggeredBy?: string;
}

export async function loadForceRefreshState(
  fetchImpl: typeof fetch = fetch,
): Promise<ForceRefreshState | null> {
  try {
    const res = await fetchWithRetry(
      bust(dataUrl("/data/force-refresh-state.json"), true),
      { cache: "no-store", retries: 2, timeoutMs: 12_000 },
      fetchImpl,
    );
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as ForceRefreshState;
  } catch {
    return null;
  }
}

export function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

const LOCAL_KEY = "schoolside.forceRefreshDate";

export function hasLocalForceRefreshToday(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(LOCAL_KEY) === utcToday();
}

export function markLocalForceRefreshToday(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_KEY, utcToday());
}

/**
 * Record a missing setting for maintainer review (Supabase product_feedback).
 * Does not start a directory rebuild from the browser. One request per UTC day.
 */
export async function requestForceRefresh(school: string): Promise<{
  ok: boolean;
  status: "queued" | "limited" | "unavailable" | "error";
  detail: string;
}> {
  if (hasLocalForceRefreshToday()) {
    return {
      ok: false,
      status: "limited",
      detail: "This browser already requested a refresh today. Try again tomorrow.",
    };
  }

  const state = await loadForceRefreshState();
  if (state?.lastForcedDate === utcToday()) {
    markLocalForceRefreshToday();
    return {
      ok: false,
      status: "limited",
      detail:
        "A directory refresh has already run today. The next one can run tomorrow.",
    };
  }

  const name = school.trim().slice(0, 200);
  const { submitOperationalIntake } = await import("@/lib/operationalIntake");
  const result = await submitOperationalIntake({
    kind: "missing-school",
    note: `Missing setting: ${name}`,
    topics: ["coverage"],
    surface: "missing-school",
    intake: { school: name },
    adaptiveQuestion: "Is a setting missing from the published directory?",
  });

  if (result.ok) {
    markLocalForceRefreshToday();
    return {
      ok: true,
      status: "queued",
      detail:
        "Thanks — we saved this missing-setting request for review and will reload the latest published directory. A rebuild is not started from the browser.",
    };
  }

  if (result.reason === "missing-env") {
    markLocalForceRefreshToday();
    return {
      ok: true,
      status: "unavailable",
      detail:
        "Request intake is not configured for this deploy. Reloaded the latest published directory instead. A rebuild is not started from the browser.",
    };
  }

  return {
    ok: false,
    status: "error",
    detail: result.detail || "Could not save that request. Try again later.",
  };
}

const LA_PACK_LOCAL_KEY = "schoolside.laPackRequestDate";

export function hasLocalLaPackRequestToday(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(LA_PACK_LOCAL_KEY) === utcToday();
}

export function markLocalLaPackRequestToday(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LA_PACK_LOCAL_KEY, utcToday());
}

/**
 * Record a request for another local authority (Supabase product_feedback).
 * Does not start a pack build from the browser. One request per UTC day.
 */
export async function requestLaPack(localAuthority: string): Promise<{
  ok: boolean;
  status: "queued" | "limited" | "unavailable" | "error";
  detail: string;
}> {
  const la = localAuthority.trim().replace(/\s+/g, " ").slice(0, 120);
  if (!la) {
    return {
      ok: false,
      status: "error",
      detail: "Enter a local authority name (exact DfE label, e.g. Surrey).",
    };
  }

  if (hasLocalLaPackRequestToday()) {
    return {
      ok: false,
      status: "limited",
      detail: "This browser already requested area coverage today. Try again tomorrow.",
    };
  }

  const { submitOperationalIntake } = await import("@/lib/operationalIntake");
  const result = await submitOperationalIntake({
    kind: "area-coverage",
    note: `Request area coverage: ${la}`,
    topics: ["coverage"],
    surface: "area-coverage",
    intake: { localAuthority: la },
    adaptiveQuestion: "Which local authority should be added to the directory?",
  });

  if (result.ok) {
    markLocalLaPackRequestToday();
    return {
      ok: true,
      status: "queued",
      detail: `Thanks — we saved a coverage request for ${la}. New areas are added by a maintainer, not started from the browser.`,
    };
  }

  if (result.reason === "missing-env") {
    markLocalLaPackRequestToday();
    return {
      ok: true,
      status: "unavailable",
      detail:
        "Area coverage requests are not configured for this deploy. Your request was not sent.",
    };
  }

  return {
    ok: false,
    status: "error",
    detail: result.detail || "Could not save that area request. Try again later.",
  };
}
