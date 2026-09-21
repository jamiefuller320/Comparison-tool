# Qualitative capture loop

- Ran at: `2026-09-21T14:23:34.658150+00:00`
- Ingest policy / phase: `auto` / `se_tail`
- Scope: `parallel`
- LA: `Brighton and Hove, Reading, Windsor and Maidenhead`
- Index: `public/data/packs/windsor-and-maidenhead/schools-index.json`
- Remaining with website (pre-capture): `22`
- Batch limit (per stream): `60`
- Sidecar records before → after: `4107` → `4151`
- Parallel streams: `3`
- Synthesize provider: `none`
- QA provider: `none`
- QA reviewed / changed: `16` / `12`
- Learned terms: `500`
- Learned QA phrases: `10`
- Dry run: `False`

## Streams

- `Brighton and Hove`: status=ok added=14 remaining=14 index=`public/data/packs/brighton-and-hove/schools-index.json`
- `Reading`: status=ok added=8 remaining=8 index=`public/data/packs/reading/schools-index.json`
- `Windsor and Maidenhead`: status=ok added=22 remaining=22 index=`public/data/packs/windsor-and-maidenhead/schools-index.json`

## Notes

- Hydrated working sidecar from 4107 published URN shards (prior=0 → 4107).
- Ingest policy=auto phase=se_tail (non-London remaining=46, London remaining=0, pending London packs=33).
- Stream preferred=Hampshire exhausted (remaining=0); advanced to Windsor and Maidenhead (remaining=22).
- Stream preferred=Dorset exhausted (remaining=0); advanced to Brighton and Hove (remaining=14).
- Stream preferred=East Sussex exhausted (remaining=0); advanced to Reading (remaining=8).
- Enriched schoolWebsite from GIAS (seed + ready packs).
- Stream LA=Windsor and Maidenhead index=public/data/packs/windsor-and-maidenhead/schools-index.json remainingWithWebsite=22.
- Stream LA=Brighton and Hove index=public/data/packs/brighton-and-hove/schools-index.json remainingWithWebsite=14.
- Stream LA=Reading index=public/data/packs/reading/schools-index.json remainingWithWebsite=8.
- Running 3 capture streams in parallel (limit 60 each).
- Merged 3 partial sidecar(s) → 4151 records (union size 4151).
- Captured batch (sidecar 4107 → 4151); learned terms now 554.
- Merged sidecar into 3 schools-index file(s).
- Selective synth provider=none; learned terms after citation merge=500.
- QA provider=none: reviewed 16, changed 12, learned phrases +10.
- Re-merged affected schools-index files after QA fixes.
