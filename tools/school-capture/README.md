# School capture (`tools/school-capture`)

Experimental qualitative and contact capture for [School Compass](https://schoolcompass.uk).

## Install

```bash
pip install -e 'tools/school-capture[llm]'   # includes cursor-sdk for narratives
```

Or from the repo root:

```bash
pip install -r requirements-data.txt
```

## Capture qualitative evidence

```bash
python3 scripts/enrich-qualitative.py --la Hampshire --require-website --limit 12

# Parent-facing narratives (Cursor SDK — same arrangement as value_investor)
export CURSOR_API_KEY="crsr_..."   # https://cursor.com/dashboard/api-keys  (User API key)
python3 scripts/enrich-qualitative.py --la Hampshire --limit 12 --synthesize

# Force OpenAI instead
OPENAI_API_KEY=... python3 scripts/enrich-qualitative.py --la Hampshire --limit 12 \
  --synthesize --synthesize-provider openai
```

`--synthesize` provider resolution (`--synthesize-provider auto`, default):

1. `CURSOR_API_KEY` → one Cursor agent call per school (`composer-2.5` by default)
2. else `OPENAI_API_KEY` → one chat completion per subject area
3. else deterministic paragraphs (no network LLM)

### Practical limitations (Cursor synthesis)

| Limit | Why it matters |
| --- | --- |
| **User API key required** | Dashboard → API Keys (`crsr_…`). Team Admin / Integrations keys are rejected by the SDK (same as value_investor). |
| **Cost & latency** | Each school is a full `Agent.prompt` turn — slower and dearer than a tiny OpenAI completion. Keep `--limit` small for pilots. |
| **Not IDE chat** | Runs via Cursor SDK in a script/CI job; cloud agents need the key in env/secrets. |
| **Citation gate** | Narratives without valid `[n]` markers are discarded → deterministic fallback for that area. |
| **JSON-only contract** | Agent must return a JSON map of area → paragraph; chatty replies fall back. |
| **No live usage API** | Budget is estimated/ops-managed (same constraint value_investor logged). |
| **CI cwd** | Local agent reads the prompt payload (excerpts inlined); still set a sensible working directory. |

Deterministic synthesis remains the soft-launch default when no key is set.

### Synthesize an existing sidecar (no re-crawl)

```bash
# Attach Cursor/OpenAI/deterministic narratives to output/qualitative-capture.json
CURSOR_API_KEY=crsr_... python3 scripts/synthesize-qualitative.py --limit 12
# or: npm run synthesize:qualitative -- --limit 12
```

## Capture contacts

```bash
python3 scripts/enrich-contacts.py --la Hampshire --require-website --limit 12
```

## Tests

```bash
cd tools/school-capture && python3 -m pytest -q
npm run test:qualitative-evidence
```

## Expanding beyond a pilot

Recommended scale-up (technical order, not a schedule):

1. **Deterministic capture in batches** — resume-safe upserts:
   ```bash
   python3 scripts/enrich-qualitative.py --la Hampshire --require-website \
     --limit 25 --skip-existing
   ```
   Sidecar upserts by URN (does not wipe prior schools). Progress → `output/qualitative-progress.json`.
2. **Synthesize selectively** — evidence gates + only-missing:
   ```bash
   python3 scripts/synthesize-qualitative.py --only-missing --min-documented-areas 2 \
     --provider auto --limit 25
   ```
3. **Daily loop** — `npm run loop:qualitative` / workflow `qualitative-loop.yml` (Hampshire: **25 new schools/day**, provider `none`; set `CURSOR_API_KEY` / `OPENAI_API_KEY` secrets only for paid polish).
4. **Other LAs** — point `--index` at `public/data/packs/{slug}/schools-index.json` (and matching `--la`), merge into that pack index, then deploy.

### Learning mechanism (what it can / cannot do)

`output/learned-url-terms.json` is a **cross-school URL/anchor term booster** for page discovery. Successful website signals raise term weights; later crawls prefer those paths. The loop applies **decay + stopword prune**, and loads **IDF-weighted boosts** (document frequency across schools) so singleton school-name phrases do not dominate ranking.

After Cursor/OpenAI narratives pass the citation gate, **cited source URLs** get an extra boost into the same lexicon — so paths that survived parent-facing synthesis are preferred on later crawls. This is still discovery learning, not a self-tuning LLM. Narratives themselves improve when you re-run synthesis with better evidence.

`synthesize-qualitative.py --only-missing` fills **missing areas only** and will not replace an accepted `cursor`/`openai` paragraph with deterministic filler on a partial failure.

### Coverage vs cost policy

| Goal | Setting |
| --- | --- |
| **Coverage (default)** | Daily free crawl (`--limit 25`) + `provider=none` deterministic narratives |
| **Paid quality polish** | `--provider cursor` / `auto`, small `--limit`, richest schools first; paid gate defaults to **4** documented areas (vs **2** for free) |
| **Daily CI** | Hampshire capture-heavy (~25/day), Cursor off unless dispatch overrides |
| **Cheap re-screens** | `--refresh-stale-days 28 --refresh-limit 5` (loop defaults). Conditional GET (`ETag` / `Last-Modified`) + body SHA-256; unchanged pages reuse cached text and skip re-assess when the whole school is unchanged |

Still out of scope: human feedback into gates, per-CMS models.

### Change-aware re-screens

Each capture stores a per-URL `pageCache` (validators + extracted text) and `discoveredUrls` on the school record.

On refresh:
1. Homepage conditional GET — if unchanged, reuse prior `discoveredUrls` (no hub walk).
2. Each page: `If-None-Match` / `If-Modified-Since`, else compare `contentHash`.
3. Unchanged pages rebuild from cache (no HTML parse). If **all** website pages are unchanged, the prior assessment is kept and only `verifiedAt` advances.
4. Partial changes re-assess; accepted narratives are preserved via `preserve_narratives`.

### Coverage report

```bash
npm run report:qualitative
```

## Product QA (précis + website)

After capture is merged into `schools-index.json`, review both products school-by-school on the internal lab page:

- Local: [http://localhost:3000/lab/content-review/](http://localhost:3000/lab/content-review/)
- Production: [https://schoolcompass.uk/lab/content-review/](https://schoolcompass.uk/lab/content-review/)

Sort by ingest date, filter to précis + website / junk flags, and open source links. The older crawler-only prototype viewer remains on the `School_data_crawler` GitHub Pages site (`/evidence/`).

## Engine version

Current `ENGINE_VERSION` is **0.6.0** (optional Cursor/OpenAI narrative synthesis with citation markers and deterministic fallback).
