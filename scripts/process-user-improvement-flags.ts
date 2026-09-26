/**
 * Process parent summary thumbs / qualitative nonsensical flags from
 * product_feedback into the quality path.
 *
 * - thumbs-up → mark ignored (light positive signal)
 * - thumbs-down + chrome phrases → output/user-improvement-flag-candidates.jsonl
 *   (+ optional qa:human-flags when --apply-chrome)
 * - thumbs-down ethos / ambiguous → GitHub issue (human gate) + triage note
 *   suggesting targeted URN refresh — never unbounded full-corpus jobs
 *
 * Env: same Supabase service_role resolution as process-product-feedback.ts
 *
 * Usage:
 *   npx tsx scripts/process-user-improvement-flags.ts [--dry-run] [--limit N] [--apply-chrome]
 */

import { spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  envUrl,
  serviceKey,
  projectRefFromUrl,
  projectRefFromServiceKey,
} from "./process-product-feedback.ts";

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

type ImprovementFlag = {
  kind: string;
  vote: "up" | "down";
  urn: string;
  schoolName?: string;
  area?: string | null;
  snippet?: string;
  surface?: string;
  reasonCode?: string | null;
  reasonLabel?: string | null;
  reasonDetail?: string | null;
};

type GateResult = {
  gate: "chrome_auto" | "gated_refresh" | "gated_review" | "ignore";
  phrases: { phrase: string; junkClass: string }[];
  reason: string;
};

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const CANDIDATES_JSONL = join(
  ROOT,
  "output",
  "user-improvement-flag-candidates.jsonl",
);
export const GATED_JSONL = join(
  ROOT,
  "output",
  "user-improvement-gated-candidates.jsonl",
);

function requireEnv(): { url: string; key: string } {
  const url = envUrl();
  const key = serviceKey();
  if (!url || !key) {
    throw new Error(
      "Set School Compass Supabase URL + service role (see process-product-feedback.ts).",
    );
  }
  const urlRef = projectRefFromUrl(url);
  const keyRef = projectRefFromServiceKey(key);
  if (urlRef && keyRef && urlRef !== keyRef) {
    throw new Error(
      `Supabase project mismatch: URL ref=${urlRef} vs key ref=${keyRef}.`,
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
      Prefer: "return=representation",
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

export function improvementFlagFromRow(
  row: FeedbackRow,
): ImprovementFlag | null {
  const usage = row.usage;
  if (usage && typeof usage === "object") {
    const flag = usage.improvementFlag;
    if (flag && typeof flag === "object") {
      const f = flag as Record<string, unknown>;
      if (
        (f.vote === "up" || f.vote === "down") &&
        typeof f.urn === "string" &&
        f.urn.trim()
      ) {
        return {
          kind: String(f.kind || ""),
          vote: f.vote,
          urn: String(f.urn).trim(),
          schoolName: typeof f.schoolName === "string" ? f.schoolName : "",
          area: typeof f.area === "string" ? f.area : null,
          snippet: typeof f.snippet === "string" ? f.snippet : "",
          surface: typeof f.surface === "string" ? f.surface : row.surface,
          reasonCode: typeof f.reasonCode === "string" ? f.reasonCode : null,
          reasonLabel: typeof f.reasonLabel === "string" ? f.reasonLabel : null,
          reasonDetail:
            typeof f.reasonDetail === "string" ? f.reasonDetail : null,
        };
      }
    }
  }
  // Topic / trigger fallback (feedback form without structured usage flag).
  const topics = Array.isArray(row.topics) ? row.topics : [];
  if (
    row.trigger === "summary-vote" ||
    topics.includes("website-scan") ||
    /\bURN\s+\d{3,}/i.test(row.note || "")
  ) {
    const urnMatch = /\bURN\s+(\d{3,})\b/i.exec(row.note || "");
    const areaMatch = /\barea\s+([a-z0-9_-]+)\b/i.exec(row.note || "");
    const snippetMatch = /\bSnippet:\s*([\s\S]+)$/i.exec(row.note || "");
    const down =
      row.sentiment === "stuck" ||
      /nonsensical|looks wrong|thumbs.?down/i.test(row.note || "");
    return {
      kind: down ? "qualitative-nonsensical" : "qualitative-useful",
      vote: down ? "down" : "up",
      urn: urnMatch?.[1] || "unknown",
      schoolName: "",
      area: areaMatch?.[1] || null,
      snippet: (snippetMatch?.[1] || row.note || "").trim().slice(0, 400),
      surface: row.surface || "compare",
      reasonCode: null,
      reasonLabel: null,
      reasonDetail: null,
    };
  }
  return null;
}

export function isImprovementFeedbackRow(row: FeedbackRow): boolean {
  return improvementFlagFromRow(row) !== null;
}

function classifyViaPython(flag: ImprovementFlag): GateResult {
  const proc = spawnSync(
    "python3",
    [join(ROOT, "scripts", "classify-user-improvement-flag.py")],
    {
      input: JSON.stringify({
        snippet: flag.snippet || "",
        area: flag.area || null,
        urn: flag.urn,
        reasonCode: flag.reasonCode || null,
        reasonDetail: flag.reasonDetail || null,
      }),
      encoding: "utf8",
      cwd: ROOT,
    },
  );
  if (proc.status !== 0 || !proc.stdout?.trim()) {
    return {
      gate: "gated_review",
      phrases: [],
      reason: `Classifier failed: ${(proc.stderr || proc.stdout || "").slice(0, 200)}`,
    };
  }
  try {
    const parsed = JSON.parse(proc.stdout) as GateResult;
    if (!parsed.gate) throw new Error("missing gate");
    return parsed;
  } catch {
    return {
      gate: "gated_review",
      phrases: [],
      reason: "Classifier returned invalid JSON.",
    };
  }
}

async function listOpenImprovement(limit: number): Promise<FeedbackRow[]> {
  // Pull a wider open window then filter — PostgREST jsonb filters vary by plan.
  const { ok, data, text, status } = await rest<FeedbackRow[]>(
    `product_feedback?status=eq.open&order=created_at.asc&limit=${Math.max(limit * 4, 80)}`,
    { method: "GET" },
  );
  if (!ok || !Array.isArray(data)) {
    throw new Error(`List open failed (${status}): ${text.slice(0, 300)}`);
  }
  return data.filter(isImprovementFeedbackRow).slice(0, limit);
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

function appendJsonl(path: string, rows: Record<string, unknown>[]): void {
  if (!rows.length) return;
  mkdirSync(dirname(path), { recursive: true });
  const body = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
  appendFileSync(path, body, "utf8");
}

function openGithubIssue(
  row: FeedbackRow,
  flag: ImprovementFlag,
  gate: GateResult,
): string | null {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
  const repo =
    process.env.CHALLENGE_INTAKE_REPO ||
    process.env.GITHUB_REPOSITORY ||
    "jamiefuller320/Comparison-tool";
  if (!token) {
    console.warn("No GITHUB_TOKEN — skipping issue for", row.id);
    return null;
  }

  const title = `[user-improvement] ${gate.gate} · URN ${flag.urn}${flag.area ? ` · ${flag.area}` : ""}`;
  const body = [
    "## Parent flagged website evidence (human gate)",
    "",
    "Queued from summary thumbs-down. **Do not** invent ethos or run unbounded corpus jobs.",
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| Feedback id | \`${row.id}\` |`,
    `| URN | \`${flag.urn}\` |`,
    `| School | ${flag.schoolName || "—"} |`,
    `| Area | \`${flag.area || "cell summary"}\` |`,
    `| Reason | \`${flag.reasonCode || "—"}\` ${flag.reasonLabel || ""} |`,
    `| Gate | \`${gate.gate}\` |`,
    `| Classifier | ${gate.reason} |`,
    "",
    "### Suggested ops",
    "",
    gate.gate === "gated_refresh"
      ? `- Targeted refresh: \`npm run enrich:qualitative -- --urn ${flag.urn}\` (or capture CLI equivalent)`
      : `- Review snippet; if chrome, \`npm run qa:human-flags -- --jsonl output/user-improvement-gated-candidates.jsonl\``,
    "- Then `npm run loop:qualitative-quality` (or wait for daily apply)",
    "",
    "### Parent detail",
    "",
    flag.reasonDetail || "_(none)_",
    "",
    "### Snippet",
    "",
    "```",
    (flag.snippet || row.note || "").slice(0, 800),
    "```",
    "",
    `_Source: product_feedback. Mark done with \`npm run feedback:process -- done ${row.id}\`._`,
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
      "--body",
      body,
    ],
    {
      encoding: "utf8",
      env: { ...process.env, GH_TOKEN: token, GITHUB_TOKEN: token },
    },
  );
  if (proc.status !== 0) {
    console.warn("gh issue create failed:", proc.stderr || proc.stdout);
    return null;
  }
  return (proc.stdout || "").trim() || null;
}

function applyChromeFlags(jsonlPath: string): void {
  const proc = spawnSync(
    "python3",
    [join(ROOT, "scripts", "record-human-qa-flags.py"), "--jsonl", jsonlPath],
    { encoding: "utf8", cwd: ROOT },
  );
  if (proc.status !== 0) {
    console.warn("qa:human-flags failed:", proc.stderr || proc.stdout);
    return;
  }
  console.log(proc.stdout.trim());
}

async function cmdRoute(args: string[]): Promise<void> {
  const dryRun = args.includes("--dry-run");
  const applyChrome = args.includes("--apply-chrome");
  const limitIdx = args.indexOf("--limit");
  const limit =
    limitIdx >= 0 ? Math.max(1, Number(args[limitIdx + 1]) || 40) : 40;

  // Fresh candidate files each run (append within the run only).
  if (!dryRun) {
    mkdirSync(dirname(CANDIDATES_JSONL), { recursive: true });
    writeFileSync(CANDIDATES_JSONL, "", "utf8");
    writeFileSync(GATED_JSONL, "", "utf8");
  }

  const rows = await listOpenImprovement(limit);
  console.log(
    `Improvement-flag rows: ${rows.length}${dryRun ? " (dry-run)" : ""}`,
  );

  let chromeCount = 0;
  let gatedCount = 0;
  let upCount = 0;

  for (const row of rows) {
    const flag = improvementFlagFromRow(row);
    if (!flag) continue;

    if (flag.vote === "up") {
      upCount += 1;
      console.log(`- ${row.id} → positive signal URN ${flag.urn}`);
      if (!dryRun) {
        await patchRow(row.id, {
          status: "ignored" satisfies FeedbackStatus,
          proposed_action: "ignore",
          triage_note:
            "Positive usefulness signal from summary thumbs-up — no quality action.",
        });
      }
      continue;
    }

    const gate = classifyViaPython(flag);
    console.log(
      `- ${row.id} → ${gate.gate} URN ${flag.urn}: ${gate.reason}`,
    );

    if (gate.gate === "chrome_auto" && gate.phrases.length) {
      chromeCount += gate.phrases.length;
      if (!dryRun) {
        appendJsonl(
          CANDIDATES_JSONL,
          gate.phrases.map((p) => ({
            phrase: p.phrase,
            junkClass: p.junkClass || "user_chrome",
            urn: flag.urn,
            area: flag.area || null,
            feedbackId: row.id,
            source: "user-summary-vote",
          })),
        );
        await patchRow(row.id, {
          status: "triaged",
          proposed_action: "implement",
          triage_note: `chrome_auto: ${gate.reason} → user-improvement-flag-candidates.jsonl (${gate.phrases.length} phrase(s)).`,
        });
      }
      continue;
    }

    if (gate.gate === "ignore") {
      if (!dryRun) {
        await patchRow(row.id, {
          status: "ignored",
          proposed_action: "ignore",
          triage_note: gate.reason,
        });
      }
      continue;
    }

    gatedCount += 1;
    if (!dryRun) {
      if (gate.phrases.length) {
        appendJsonl(
          GATED_JSONL,
          gate.phrases.map((p) => ({
            phrase: p.phrase,
            junkClass: p.junkClass || "user_flag",
            urn: flag.urn,
            area: flag.area || null,
            feedbackId: row.id,
            source: "user-summary-vote-gated",
            gate: gate.gate,
          })),
        );
      }
      const issueUrl = openGithubIssue(row, flag, gate);
      await patchRow(row.id, {
        status: "triaged",
        proposed_action: "implement",
        triage_note: `${gate.gate}: ${gate.reason}`,
        github_issue_url: issueUrl,
      });
    }
  }

  if (!dryRun && applyChrome && chromeCount > 0) {
    console.log(`Applying ${chromeCount} chrome phrase(s) via qa:human-flags…`);
    applyChromeFlags(CANDIDATES_JSONL);
  }

  console.log(
    JSON.stringify({
      processed: rows.length,
      thumbsUp: upCount,
      chromePhrases: chromeCount,
      gated: gatedCount,
      applyChrome: applyChrome && !dryRun,
      candidatesPath: CANDIDATES_JSONL,
      gatedPath: GATED_JSONL,
    }),
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("help") || args.includes("--help")) {
    console.log(`Usage:
  process-user-improvement-flags.ts [--dry-run] [--limit N] [--apply-chrome]`);
    return;
  }
  await cmdRoute(args);
}

const isEntry =
  typeof process.argv[1] === "string" &&
  /process-user-improvement-flags\.(ts|js|mjs|cjs)$/.test(process.argv[1]);

if (isEntry) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
