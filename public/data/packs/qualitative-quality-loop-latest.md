# Qualitative quality loop — 2026-11-08T06:20:16.165598+00:00

- Mode: `corpus-sweep`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `7382`
- Suspects before → after: `0` → `0`
- QA reviewed / changed: `0` / `0`
- Findings applied: `0`
- Learned phrases added: `0`
- Merged to index: `False`
- Apply trigger: `corpus-sweep-only; suspect-window QA skipped`

- Corpus sweep: `forced (--corpus-sweep-only)`
- Chrome offerings removed: `665` across `285` schools (7382 shards scanned)

## Chrome labels removed

- `contact details`: 334
- `parentpay`: 127
- `parent pay`: 91
- `school dinners`: 51
- `accessibility`: 42
- `translate`: 20

## Corpus sweep sample

- `100013` Edith Neville Primary School: Contact Details
- `100050` Parliament Hill School: ParentPay, ParentPay, ParentPay
- `100099` Abbey Wood Nursery School: ParentPay, ParentPay, ParentPay, ParentPay, ParentPay
- `100174` St Alfege with St Peter's Church of England Primary School: ParentPay, ParentPay, ParentPay
- `100354` Good Shepherd RC Primary School: Contact Details
- `100425` Thornhill Primary School: ParentPay
- `100443` St Luke's CofE Primary School: Contact Details
- `100448` St Andrew's (Barnsbury) Church of England Primary School: Contact Details

## Top flag counts (before)

- (none)

## Notes

- Learning fingerprint: {'phraseHash': '00a67bb08bd66dd734e2', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 11094, 'updatedAt': '2026-11-04', 'chromeDenylistCount': 9}
- Apply decision: corpus-sweep-only; suspect-window QA skipped
- Corpus sweep decision: forced (--corpus-sweep-only)
- Corpus sweep removed 665 chrome offering(s) from 285 school(s) across 7382 shards.
- Corpus sweep reads published shards directly; sidecar hydrate skipped.
- Updated output/learned-qa-apply-state.json
- Suspect-window QA skipped. Corpus sweep applied exact chrome and learned-chrome labels across every shard.
