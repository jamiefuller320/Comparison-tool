# School capture (`tools/school-capture`)

Experimental qualitative and contact capture for [School Compass](https://schoolcompass.uk).

## Install

```bash
pip install -e tools/school-capture
```

Or from the repo root:

```bash
pip install -r requirements-data.txt
```

## Capture qualitative evidence

```bash
python3 scripts/enrich-qualitative.py --la Hampshire --require-website --limit 12
python3 scripts/enrich-qualitative.py --la Hampshire --limit 12 --synthesize  # needs OPENAI_API_KEY
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

## Engine version

Current `ENGINE_VERSION` is **0.6.0** (adds optional LLM narrative synthesis with citation markers and deterministic fallback).
