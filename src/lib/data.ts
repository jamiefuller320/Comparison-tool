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

export async function loadSchoolsIndex(
  fetchImpl: typeof fetch = fetch,
  cacheBust = false,
): Promise<SchoolsIndex> {
  const url = cacheBust
    ? `${dataUrl("/data/schools-index.json")}?t=${Date.now()}`
    : dataUrl("/data/schools-index.json");
  const res = await fetchImpl(url, {
    cache: cacheBust ? "no-store" : "default",
  });
  if (!res.ok) {
    throw new Error(`Failed to load school index (${res.status})`);
  }
  return res.json() as Promise<SchoolsIndex>;
}

export async function loadEyProvidersIndex(
  fetchImpl: typeof fetch = fetch,
  cacheBust = false,
): Promise<EyProvidersIndex | null> {
  const url = cacheBust
    ? `${dataUrl("/data/ey-providers-index.json")}?t=${Date.now()}`
    : dataUrl("/data/ey-providers-index.json");
  try {
    const res = await fetchImpl(url, {
      cache: cacheBust ? "no-store" : "default",
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Failed to load early years index (${res.status})`);
    }
    return res.json() as Promise<EyProvidersIndex>;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Failed to load")) {
      throw err;
    }
    return null;
  }
}

export async function loadChildmindersIndex(
  fetchImpl: typeof fetch = fetch,
  cacheBust = false,
): Promise<ChildmindersIndex | null> {
  const url = cacheBust
    ? `${dataUrl("/data/childminders-index.json")}?t=${Date.now()}`
    : dataUrl("/data/childminders-index.json");
  try {
    const res = await fetchImpl(url, {
      cache: cacheBust ? "no-store" : "default",
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Failed to load childminders index (${res.status})`);
    }
    return res.json() as Promise<ChildmindersIndex>;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Failed to load")) {
      throw err;
    }
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
    const res = await fetchImpl(
      `${dataUrl("/data/force-refresh-state.json")}?t=${Date.now()}`,
      { cache: "no-store" },
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
