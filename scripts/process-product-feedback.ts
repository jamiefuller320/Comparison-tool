/**
 * Product feedback triage CLI (service_role).
 *
 * Heuristic classify → proposed_action + triage_note; human gate before product changes.
 * Does NOT auto-merge PRs or apply UX changes.
 *
 * Env (GitHub Actions — Comparison-tool repo only; same names are fine per-repo):
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Env (Cursor / shared cloud secrets — use distinct names so Home Learning’s
 * SUPABASE_SERVICE_ROLE_KEY is never overwritten or reused against this project):
 *   SCHOOL_COMPASS_SUPABASE_URL or COMPARISON_TOOL_SUPABASE_URL
 *   SCHOOL_COMPASS_SUPABASE_SERVICE_ROLE_KEY or COMPARISON_TOOL_SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional: GITHUB_TOKEN / GH_TOKEN, CHALLENGE_INTAKE_REPO
 *
 * Usage:
 *   npx tsx scripts/process-product-feedback.ts route [--dry-run] [--limit N]
 *   npx tsx scripts/process-product-feedback.ts list [--status open|triaged|…]
 *   npx tsx scripts/process-product-feedback.ts done <id> [--note "…"]
 *   npx tsx scripts/process-product-feedback.ts ignore <id> [--note "…"]
 */

import { spawnSync } from "node:child_process";

type ProposedAction = "implement" | "ignore" | "needs_clarification";
type FeedbackStatus =
  | "open"
  | "triaged"
  | "implemented"
  | "ignored"
  | "needs_clarification";

type FeedbackRow = {
  id: string;
  created_at: string;
  campaign_id: string;
  app_version: string;
  trigger: string;
  sentiment: string;
  topics: string[] | null;
  note: string;
  contact_email: string | null;
  adaptive_question: string;
  page_url: string;
  surface: string;
  usage: Record<string, unknown> | null;
  status: string;
  proposed_action: string | null;
  triage_note: string;
  github_issue_url: string | null;
};

/** First non-empty trimmed env value. */
function firstEnv(...names: string[]): string {
  for (const name of names) {
    const val = (process.env[name] || "").trim();
    if (val) return val;
  }
  return "";
}

/**
 * Prefer School Compass–specific Cursor secret names so a shared
 * SUPABASE_SERVICE_ROLE_KEY (Home Learning) is not used by mistake.
 * GitHub Actions on this repo can keep using SUPABASE_* / NEXT_PUBLIC_*.
 */
export function envUrl(): string {
  return firstEnv(
    "SCHOOL_COMPASS_SUPABASE_URL",
    "COMPARISON_TOOL_SUPABASE_URL",
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
  ).replace(/\/$/, "");
}

export function serviceKey(): string {
  return firstEnv(
    "SCHOOL_COMPASS_SUPABASE_SERVICE_ROLE_KEY",
    "COMPARISON_TOOL_SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  );
}

/** Project ref from https://<ref>.supabase.co */
export function projectRefFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const m = /^([a-z0-9]+)\.supabase\.co$/.exec(host);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/** Project ref claim from a legacy JWT-shaped service_role key (eyJ…). */
export function projectRefFromServiceKey(key: string): string | null {
  if (!key.startsWith("eyJ")) return null;
  const parts = key.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (payload.length % 4)) % 4);
    const json = Buffer.from(payload + pad, "base64").toString("utf8");
    const data = JSON.parse(json) as { ref?: unknown };
    return typeof data.ref === "string" && data.ref ? data.ref : null;
  } catch {
    return null;
  }
}

function requireEnv(): { url: string; key: string } {
  const url = envUrl();
  const key = serviceKey();
  if (!url || !key) {
    throw new Error(
      "Set School Compass Supabase URL + service role. " +
        "GitHub Actions: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY. " +
        "Cursor cloud secrets (shared by name — do not overwrite Home Learning): " +
        "SCHOOL_COMPASS_SUPABASE_URL + SCHOOL_COMPASS_SUPABASE_SERVICE_ROLE_KEY " +
        "(or COMPARISON_TOOL_* aliases).",
    );
  }
  const urlRef = projectRefFromUrl(url);
  const keyRef = projectRefFromServiceKey(key);
  if (urlRef && keyRef && urlRef !== keyRef) {
    throw new Error(
      `Supabase project mismatch: URL is ref=${urlRef} but service_role JWT is ref=${keyRef}. ` +
        "Cursor’s shared SUPABASE_SERVICE_ROLE_KEY is likely Home Learning — add " +
        "SCHOOL_COMPASS_SUPABASE_SERVICE_ROLE_KEY (School Compass service_role) instead of overwriting it.",
    );
  }
  return { url, key };
}

async function rest<T>(
  path: string,
  init: RequestInit & { method?: string } = {},
): Promise<{ ok: boolean; status: number; data: T | null; text: string }> {
  const { url, key } = requireEnv();
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: init.method === "PATCH" ? "return=representation" : "return=representation",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let data: T | null = null;
  try {
    data = text ? (JSON.parse(text) as T) : null;
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data, text };
}

export function classifyFeedback(row: FeedbackRow): {
  action: ProposedAction;
  note: string;
} {
  const note = (row.note || "").trim();
  const lower = note.toLowerCase();
  const topics = Array.isArray(row.topics) ? row.topics : [];
  const sentiment = (row.sentiment || "").toLowerCase();

  // Spam / empty shells
  if (
    !note ||
    note === "(no free-text note)" ||
    /^(test|asdf|xxx|spam)\b/i.test(note) ||
    note.length < 8
  ) {
    if (!topics.length) {
      return {
        action: "ignore",
        note: "Too short / empty for actionable product work.",
      };
    }
  }

  // Out of scope / already-shipped vibes
  if (
    /\b(league table|rank(ing)? schools|best school in england|crypto|viagra)\b/i.test(
      lower,
    )
  ) {
    return {
      action: "ignore",
      note: "Out of scope for parental compare soft-launch.",
    };
  }

  // Needs clarification
  if (
    note.length < 24 &&
    !topics.length &&
    !/\b(bug|broken|crash|error|missing|wrong|print|map|compare)\b/i.test(lower)
  ) {
    return {
      action: "needs_clarification",
      note: "Vague without topics or reproduction detail.",
    };
  }

  // Concrete UX / data / print / map signals → propose implement
  const implementHints =
    /\b(bug|broken|crash|error|doesn'?t work|cannot|can'?t|missing|wrong|incorrect|blank|print|visit pack|map pin|postcode|shortlist|side by side|compare|ofsted|ks2|ks4|iphone|android|mobile|layout|overlap)\b/i;
  if (
    implementHints.test(lower) ||
    sentiment === "stuck" ||
    topics.some((t) =>
      ["map", "compare", "print-pack", "data-trust", "shortlist"].includes(t),
    )
  ) {
    return {
      action: "implement",
      note: "Concrete UX/data signal — open proposed-implement issue for human/agent approval.",
    };
  }

  if (sentiment === "not-for-me" && note.length < 40) {
    return {
      action: "ignore",
      note: "Audience mismatch without a concrete change request.",
    };
  }

  if (note.length >= 40 || topics.length > 0) {
    return {
      action: "implement",
      note: "Substantive soft-launch learning — queue for human review.",
    };
  }

  return {
    action: "needs_clarification",
    note: "Not enough context to propose implement or ignore.",
  };
}

async function listOpen(limit: number): Promise<FeedbackRow[]> {
  const { ok, data, text, status } = await rest<FeedbackRow[]>(
    `product_feedback?status=eq.open&order=created_at.asc&limit=${limit}`,
    { method: "GET", headers: { Prefer: "return=representation" } },
  );
  if (!ok || !Array.isArray(data)) {
    throw new Error(`List open failed (${status}): ${text.slice(0, 300)}`);
  }
  return data;
}

async function listByStatus(
  status: FeedbackStatus,
  limit: number,
): Promise<FeedbackRow[]> {
  const { ok, data, text, status: http } = await rest<FeedbackRow[]>(
    `product_feedback?status=eq.${status}&order=created_at.desc&limit=${limit}`,
    { method: "GET" },
  );
  if (!ok || !Array.isArray(data)) {
    throw new Error(`List failed (${http}): ${text.slice(0, 300)}`);
  }
  return data;
}

async function patchRow(
  id: string,
  patch: Record<string, unknown>,
): Promise<FeedbackRow> {
  const { ok, data, text, status } = await rest<FeedbackRow[]>(
    `product_feedback?id=eq.${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
  if (!ok || !Array.isArray(data) || !data[0]) {
    throw new Error(`Patch ${id} failed (${status}): ${text.slice(0, 300)}`);
  }
  return data[0];
}

function openGithubIssue(row: FeedbackRow, triageNote: string): string | null {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
  const repo =
    process.env.CHALLENGE_INTAKE_REPO ||
    process.env.GITHUB_REPOSITORY ||
    "jamiefuller320/Comparison-tool";
  if (!token) {
    console.warn("No GITHUB_TOKEN — skipping issue create for", row.id);
    return null;
  }

  const title = `[product-feedback] proposed-implement · ${row.sentiment || "note"} · ${row.surface || row.trigger}`;
  const body = [
    "## Proposed implement (human gate)",
    "",
    "Automated triage suggested **implement**. Do **not** merge product changes without approval.",
    "",
    `| Field | Value |`,
    `| --- | --- |`,
    `| Id | \`${row.id}\` |`,
    `| Campaign | \`${row.campaign_id}\` |`,
    `| Sentiment | \`${row.sentiment}\` |`,
    `| Topics | ${(row.topics || []).join(", ") || "—"} |`,
    `| Surface | \`${row.surface || "—"}\` |`,
    `| Trigger | \`${row.trigger}\` |`,
    `| Page | ${row.page_url || "—"} |`,
    `| Triage | ${triageNote} |`,
    "",
    "### Reporter note",
    "",
    row.note || "_(empty)_",
    "",
    "### Adaptive question",
    "",
    row.adaptive_question || "—",
    "",
    `_Source: Supabase product_feedback. Mark implemented with \`npx tsx scripts/process-product-feedback.ts done ${row.id}\`._`,
  ].join("\n");

  const proc = spawnSync(
    "gh",
    [
      "issue",
      "create",
      "--repo",
      repo,
      "--title",
      title.slice(0, 180),
      "--label",
      "product-feedback",
      "--label",
      "proposed-implement",
      "--body",
      body,
    ],
    {
      encoding: "utf8",
      env: { ...process.env, GH_TOKEN: token, GITHUB_TOKEN: token },
    },
  );

  if (proc.status !== 0) {
    // Retry with only product-feedback if proposed-implement label missing
    const retry = spawnSync(
      "gh",
      [
        "issue",
        "create",
        "--repo",
        repo,
        "--title",
        title.slice(0, 180),
        "--label",
        "product-feedback",
        "--body",
        body,
      ],
      {
        encoding: "utf8",
        env: { ...process.env, GH_TOKEN: token, GITHUB_TOKEN: token },
      },
    );
    if (retry.status !== 0) {
      console.warn("gh issue create failed:", retry.stderr || proc.stderr);
      return null;
    }
    return (retry.stdout || "").trim() || null;
  }
  return (proc.stdout || "").trim() || null;
}

async function cmdRoute(args: string[]): Promise<void> {
  const dryRun = args.includes("--dry-run");
  const limitIdx = args.indexOf("--limit");
  const limit =
    limitIdx >= 0 ? Math.max(1, Number(args[limitIdx + 1]) || 50) : 50;
  const rows = await listOpen(limit);
  console.log(`Open rows: ${rows.length}${dryRun ? " (dry-run)" : ""}`);

  for (const row of rows) {
    const { action, note } = classifyFeedback(row);
    console.log(`- ${row.id} → ${action}: ${note}`);
    if (dryRun) continue;

    let githubUrl: string | null = null;
    let status: FeedbackStatus = "triaged";
    if (action === "ignore") {
      status = "ignored";
    } else if (action === "needs_clarification") {
      status = "needs_clarification";
    } else if (action === "implement") {
      githubUrl = openGithubIssue(row, note);
      status = "triaged";
    }

    await patchRow(row.id, {
      proposed_action: action,
      triage_note: note,
      status,
      github_issue_url: githubUrl,
    });
  }
}

async function cmdList(args: string[]): Promise<void> {
  const statusIdx = args.indexOf("--status");
  const status = (
    statusIdx >= 0 ? args[statusIdx + 1] : "open"
  ) as FeedbackStatus;
  const rows = await listByStatus(status, 50);
  for (const row of rows) {
    console.log(
      [
        row.id,
        row.status,
        row.proposed_action || "-",
        row.sentiment,
        (row.note || "").slice(0, 80).replace(/\s+/g, " "),
      ].join("\t"),
    );
  }
}

async function cmdDone(id: string, note: string): Promise<void> {
  await patchRow(id, {
    status: "implemented",
    triage_note: note || "Marked implemented by maintainer.",
  });
  console.log("marked implemented", id);
}

async function cmdIgnore(id: string, note: string): Promise<void> {
  await patchRow(id, {
    status: "ignored",
    proposed_action: "ignore",
    triage_note: note || "Ignored by maintainer.",
  });
  console.log("marked ignored", id);
}

function flagValue(args: string[], name: string): string {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] || "" : "";
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === "help" || cmd === "--help") {
    console.log(`Usage:
  process-product-feedback.ts route [--dry-run] [--limit N]
  process-product-feedback.ts list [--status open|triaged|implemented|ignored|needs_clarification]
  process-product-feedback.ts done <id> [--note "…"]
  process-product-feedback.ts ignore <id> [--note "…"]`);
    return;
  }

  if (cmd === "route") {
    await cmdRoute(rest);
    return;
  }
  if (cmd === "list") {
    await cmdList(rest);
    return;
  }
  if (cmd === "done") {
    const id = rest[0];
    if (!id) throw new Error("done requires <id>");
    await cmdDone(id, flagValue(rest, "--note"));
    return;
  }
  if (cmd === "ignore") {
    const id = rest[0];
    if (!id) throw new Error("ignore requires <id>");
    await cmdIgnore(id, flagValue(rest, "--note"));
    return;
  }
  throw new Error(`Unknown command: ${cmd}`);
}

const isEntry =
  typeof process.argv[1] === "string" &&
  /process-product-feedback\.(ts|js|mjs|cjs)$/.test(process.argv[1]);

if (isEntry) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
