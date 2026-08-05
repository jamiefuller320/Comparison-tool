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

## Capture contacts

```bash
python3 scripts/enrich-contacts.py --la Hampshire --require-website --limit 12
```

## Tests

```bash
cd tools/school-capture && python3 -m pytest -q
npm run test:qualitative-evidence
```

## Engine version

Current `ENGINE_VERSION` is **0.6.0** (optional Cursor/OpenAI narrative synthesis with citation markers and deterministic fallback).
