# Qualitative capture loop

- Ran at: `2026-10-08T15:58:01.020358+00:00`
- Ingest policy / phase: `auto` / `london`
- Scope: `parallel`
- LA: `Brent, Greenwich, Hillingdon`
- Index: `public/data/packs/hillingdon/schools-index.json`
- Remaining with website (pre-capture): `45`
- Batch limit (per stream): `60`
- Sidecar records before → after: `6601` → `6720`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `15`
- Learned terms: `500`
- Learned QA phrases: `27`
- Dry run: `False`

## Streams

- `Brent`: status=ok added=36 remaining=36 index=`public/data/packs/brent/schools-index.json`
- `Greenwich`: status=ok added=38 remaining=38 index=`public/data/packs/greenwich/schools-index.json`
- `Hillingdon`: status=ok added=45 remaining=45 index=`public/data/packs/hillingdon/schools-index.json`

## Notes

- Hydrated working sidecar from 6601 published URN shards (prior=0 → 6601).
- Ingest policy=auto phase=london (non-London remaining=0, London remaining=524, pending London packs=0).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Hillingdon (remaining=45).
- Stream preferred=Lambeth exhausted (remaining=0); advanced to Greenwich (remaining=38).
- Stream preferred=Tower Hamlets exhausted (remaining=0); advanced to Brent (remaining=36).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Hillingdon index=public/data/packs/hillingdon/schools-index.json remainingWithWebsite=45.
- Stream LA=Greenwich index=public/data/packs/greenwich/schools-index.json remainingWithWebsite=38.
- Stream LA=Brent index=public/data/packs/brent/schools-index.json remainingWithWebsite=36.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 6720 records (union size 6720).
- Captured batch (sidecar 6601 → 6720); learned terms now 555.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 15, learned phrases +27.
- Re-merged affected schools-index files after QA fixes.
