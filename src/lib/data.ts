import type {
  ChildmindersIndex,
  EyProvidersIndex,
  SchoolsIndex,
} from "@/lib/types";
import { fetchWithRetry } from "@/lib/resilientFetch";

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
 * Ask GitHub Actions to rebuild the school index (repository_dispatch).
 * Requires NEXT_PUBLIC_MISSING_SCHOOL_DISPATCH_TOKEN at build time
 * (fine-grained PAT with Actions write on this repo). Workflow enforces 1/day.
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

  const token = process.env.NEXT_PUBLIC_MISSING_SCHOOL_DISPATCH_TOKEN;
  const repo =
    process.env.NEXT_PUBLIC_GITHUB_REPO || "jamiefuller320/Comparison-tool";

  if (!token) {
    markLocalForceRefreshToday();
    return {
      ok: true,
      status: "unavailable",
      detail:
        "Refresh token is not configured for this deploy. Reloaded the latest published index instead — ask the maintainer to set MISSING_SCHOOL_DISPATCH_TOKEN for full rebuilds.",
    };
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: "missing-school",
        client_payload: {
          school: school.slice(0, 200),
          requestedAt: new Date().toISOString(),
        },
      }),
    });

    if (res.status === 204 || res.ok) {
      markLocalForceRefreshToday();
      return {
        ok: true,
        status: "queued",
        detail:
          "Refresh queued. The directory usually updates within a few minutes — reload this page shortly.",
      };
    }

    const body = await res.text();
    return {
      ok: false,
      status: "error",
      detail: `Could not queue refresh (${res.status}). ${body.slice(0, 180)}`,
    };
  } catch {
    return {
      ok: false,
      status: "error",
      detail: "Network error while requesting a refresh. Try again later.",
    };
  }
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
 * Queue an on-demand LA pack build (repository_dispatch `la-pack`).
 * Reuses the missing-school dispatch token. Workflow enforces one pack/day.
 */
export async function requestLaPack(localAuthority: string): Promise<{
  ok: boolean;
  status: "queued" | "limited" | "unavailable" | "error";
  detail: string;
}> {
  const la = localAuthority.trim().replace(/\s+/g, " ");
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

  const token = process.env.NEXT_PUBLIC_MISSING_SCHOOL_DISPATCH_TOKEN;
  const repo =
    process.env.NEXT_PUBLIC_GITHUB_REPO || "jamiefuller320/Comparison-tool";

  if (!token) {
    markLocalLaPackRequestToday();
    return {
      ok: true,
      status: "unavailable",
      detail:
        "Area coverage requests are not configured for this deploy. Ask the maintainer to set MISSING_SCHOOL_DISPATCH_TOKEN.",
    };
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: "la-pack",
        client_payload: {
          localAuthority: la.slice(0, 120),
          requestedAt: new Date().toISOString(),
        },
      }),
    });

    if (res.status === 204 || res.ok) {
      markLocalLaPackRequestToday();
      return {
        ok: true,
        status: "queued",
        detail: `Queued coverage for ${la}. When the refresh finishes and deploys, those schools appear on the map and in search automatically.`,
      };
    }

    const body = await res.text();
    return {
      ok: false,
      status: "error",
      detail: `Could not queue area coverage (${res.status}). ${body.slice(0, 180)}`,
    };
  } catch {
    return {
      ok: false,
      status: "error",
      detail: "Network error while requesting area coverage. Try again later.",
    };
  }
}
