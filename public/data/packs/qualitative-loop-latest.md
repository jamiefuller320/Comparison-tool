# Qualitative capture loop

- Ran at: `2026-09-24T14:31:00.559103+00:00`
- Ingest policy / phase: `auto` / `london`
- Scope: `parallel`
- LA: `Croydon, Lambeth, Tower Hamlets`
- Index: `public/data/packs/croydon/schools-index.json`
- Remaining with website (pre-capture): `146`
- Batch limit (per stream): `60`
- Sidecar records before → after: `4214` → `4394`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `16`
- Learned terms: `500`
- Learned QA phrases: `20`
- Dry run: `False`

## Streams

- `Croydon`: status=ok added=60 remaining=146 index=`public/data/packs/croydon/schools-index.json`
- `Lambeth`: status=ok added=60 remaining=72 index=`public/data/packs/lambeth/schools-index.json`
- `Tower Hamlets`: status=ok added=60 remaining=87 index=`public/data/packs/tower-hamlets/schools-index.json`

## Notes

- Hydrated working sidecar from 4214 published URN shards (prior=0 → 4214).
- Ingest policy=auto phase=london (non-London remaining=0, London remaining=2911, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Croydon (remaining=146).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Croydon index=public/data/packs/croydon/schools-index.json remainingWithWebsite=146.
- Stream LA=Lambeth index=public/data/packs/lambeth/schools-index.json remainingWithWebsite=72.
- Stream LA=Tower Hamlets index=public/data/packs/tower-hamlets/schools-index.json remainingWithWebsite=87.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 4394 records (union size 4394).
- Captured batch (sidecar 4214 → 4394); learned terms now 562.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 16, learned phrases +20.
- Re-merged affected schools-index files after QA fixes.
