/**
 * Bandwidth-friendly JSON fetch helpers for static GitHub Pages assets.
 * Retries transient failures; optional soft-fail for non-critical packs.
 */

export type ResilientFetchInit = RequestInit & {
  /** Total attempts including the first. Default 3. */
  retries?: number;
  /** Per-attempt timeout in ms. Default 25_000. */
  timeoutMs?: number;
  /** Base delay for exponential backoff in ms. Default 400. */
  backoffMs?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function mergeSignals(
  external: AbortSignal | null | undefined,
  timeoutMs: number,
): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener("abort", onAbort, { once: true });
  }
  return {
    signal: controller.signal,
    clear: () => {
      clearTimeout(timer);
      if (external) external.removeEventListener("abort", onAbort);
    },
  };
}

/**
 * fetch() with per-attempt timeout and retries on network / 5xx / 429.
 * 404 and other 4xx (except 408/425/429) are returned without retry.
 */
export async function fetchWithRetry(
  input: string,
  init: ResilientFetchInit = {},
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const retries = Math.max(1, init.retries ?? 3);
  const timeoutMs = init.timeoutMs ?? 25_000;
  const backoffMs = init.backoffMs ?? 400;
  const { retries: _r, timeoutMs: _t, backoffMs: _b, signal, ...rest } = init;

  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const gate = mergeSignals(signal, timeoutMs);
    try {
      const res = await fetchImpl(input, { ...rest, signal: gate.signal });
      gate.clear();
      if (res.ok || res.status === 404 || !isRetryableStatus(res.status)) {
        return res;
      }
      lastError = new Error(`HTTP ${res.status}`);
      if (attempt === retries) return res;
    } catch (err) {
      gate.clear();
      lastError = err;
      if (attempt === retries) throw err;
    }
    await sleep(backoffMs * 2 ** (attempt - 1));
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Request failed after retries");
}

export async function fetchJsonWithRetry<T>(
  input: string,
  init: ResilientFetchInit = {},
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; data: T } | { ok: false; status: number | null; error: string }> {
  try {
    const res = await fetchWithRetry(input, init, fetchImpl);
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: `HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Timed out"
          : err.message
        : "Network error";
    return { ok: false, status: null, error: message };
  }
}

/** Run async work over items with a fixed concurrency limit. */
export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const limit = Math.max(1, Math.min(concurrency, items.length || 1));
  const results: R[] = new Array(items.length);
  let next = 0;

  async function run(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => run()));
  return results;
}
