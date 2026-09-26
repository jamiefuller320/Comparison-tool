# Human-gated review digest — 2026-09-26T10:24:06+00:00

- Mode: `collate`
- Open items: **9** (queue total `9` · done `0` · ignored `0`)
- New / refreshed this run: `9`
- Auto-closed (already learned): `0`

## How to review / mark done

1. **Ambiguous chrome phrases** → confirm junk, then:
   - `npm run qa:human-flags -- --jsonl output/spotcheck-human-gated-candidates.jsonl`
   - or `… output/user-improvement-gated-candidates.jsonl`
   - then `npm run loop:qualitative-quality -- --force`
2. **Ethos / underclaim / missing-point** → targeted recapture (`enrich:qualitative --urn …`), not phrase strip.
3. **Parent thumbs / improvement flags** → after fix, `npm run feedback:process -- done <feedbackId>`.
4. **Close the digest ledger row** → `npm run review:human-gated -- --mark-done <id>` (or `--mark-done-feedback <uuid>`).
5. Optional: re-run collation with `--auto-close-learned` after applying phrases so learned rows drop from open.

## Open by kind

- `unsupported_offerings`: 5
- `ethos_underclaim`: 4

## Items

- **ethos_underclaim** `1c861310d7447668` St Anne's Catholic Primary School (URN `147519`)
  - area `ethos`; flag `possible_underclaim`; source `qualitative-spotcheck-latest`
  - Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells
  - excerpts: faithful, let all you do, our mission, our vision
  - review:
    - `npm run enrich:qualitative -- --urn 147519`
    - `npm run review:human-gated -- --mark-done 1c861310d7447668`
- **ethos_underclaim** `7d21b4f2e7266a53` Millais School (URN `126066`)
  - area `ethos`; flag `possible_underclaim`; source `qualitative-spotcheck-latest`
  - Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells
  - excerpts: our mission
  - review:
    - `npm run enrich:qualitative -- --urn 126066`
    - `npm run review:human-gated -- --mark-done 7d21b4f2e7266a53`
- **ethos_underclaim** `7df4288529bdb735` East Stour Primary School (URN `148991`)
  - area `ethos`; flag `possible_underclaim`; source `qualitative-spotcheck-latest`
  - Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells
  - excerpts: our vision
  - review:
    - `npm run enrich:qualitative -- --urn 148991`
    - `npm run review:human-gated -- --mark-done 7df4288529bdb735`
- **ethos_underclaim** `b95cf95d690bc057` Stafford Junior School (URN `148724`)
  - area `ethos`; flag `possible_underclaim`; source `qualitative-spotcheck-latest`
  - Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells
  - excerpts: be the best you can be, our mission, our values, our vision
  - review:
    - `npm run enrich:qualitative -- --urn 148724`
    - `npm run review:human-gated -- --mark-done b95cf95d690bc057`
- **unsupported_offerings** `17060849b9f8fbe6` Millais School (URN `126066`)
  - flag `unsupported_offerings`; source `qualitative-spotcheck-latest`
  - Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check)
  - excerpts: curriculum: drama, enrichment: music
  - review:
    - `npm run enrich:qualitative -- --urn 126066`
    - `npm run review:human-gated -- --mark-done 17060849b9f8fbe6`
- **unsupported_offerings** `2a83b57167e6536b` Stafford Junior School (URN `148724`)
  - flag `unsupported_offerings`; source `qualitative-spotcheck-latest`
  - Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check)
  - excerpts: curriculum: dance, curriculum: geography, curriculum: Adventures of Isobel, curriculum: Alfred, Lord Tennyson, curriculum: Alternative Story Ending
  - review:
    - `npm run enrich:qualitative -- --urn 148724`
    - `npm run review:human-gated -- --mark-done 2a83b57167e6536b`
- **unsupported_offerings** `45b485a1d8d12e8d` Platanos College (URN `136450`)
  - flag `unsupported_offerings`; source `qualitative-spotcheck-latest`
  - Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check)
  - excerpts: curriculum: Healthy Body Healthy, curriculum: Electrolysis, curriculum: Photosynthesis, curriculum: Radioactivity, curriculum: Reproduction
  - review:
    - `npm run enrich:qualitative -- --urn 136450`
    - `npm run review:human-gated -- --mark-done 45b485a1d8d12e8d`
- **unsupported_offerings** `d3915f61c0db92cb` St Anne's Catholic Primary School (URN `147519`)
  - flag `unsupported_offerings`; source `qualitative-spotcheck-latest`
  - Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check)
  - excerpts: enrichment: music, enrichment: music lovers, community: swimming, community: basketball, community: Helpline. Dedicated NSPCC
  - review:
    - `npm run enrich:qualitative -- --urn 147519`
    - `npm run review:human-gated -- --mark-done d3915f61c0db92cb`
- **unsupported_offerings** `f9c3b8ec657089f6` Rose Green Junior School (URN `141600`)
  - flag `unsupported_offerings`; source `qualitative-spotcheck-latest`
  - Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check)
  - excerpts: curriculum: computing, curriculum: geography, curriculum: Dreams and Goals, curriculum: Online Relationships Healthy Eating, curriculum: Foreign Language Overview
  - review:
    - `npm run enrich:qualitative -- --urn 141600`
    - `npm run review:human-gated -- --mark-done f9c3b8ec657089f6`

## Artefacts

- Digest JSON: `public/data/packs/human-gated-review-latest.json`
- Digest MD: `public/data/packs/human-gated-review-latest.md`
- Durable queue: `output/human-gated-review-queue.jsonl`

## Notes

- No spotcheck gated JSONL yet (expects output/spotcheck-human-gated-candidates.jsonl after auto-learn PR)
- No user-improvement gated JSONL yet (expects output/user-improvement-gated-candidates.jsonl after thumbs PR)
