# Human-gated review digest — 2026-10-05T21:22:53+00:00

- Mode: `collate`
- Open items: **22** (queue total `22` · done `0` · ignored `0`)
- New / refreshed this run: `6`
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

- `unsupported_offerings`: 12
- `ethos_underclaim`: 10

## Items

- **ethos_underclaim** `7df4288529bdb735` East Stour Primary School (URN `148991`)
  - area `ethos`; flag `possible_underclaim`; source `qualitative-spotcheck-latest`
  - Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells
  - excerpts: our vision
  - review:
    - `npm run enrich:qualitative -- --urn 148991`
    - `npm run review:human-gated -- --mark-done 7df4288529bdb735`
- **ethos_underclaim** `177b2a894139ebb6` Bullers Wood School (URN `136709`)
  - area `ethos`; flag `possible_underclaim`; source `qualitative-spotcheck-latest`
  - Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells
  - excerpts: be the best you can be
  - review:
    - `npm run enrich:qualitative -- --urn 136709`
    - `npm run review:human-gated -- --mark-done 177b2a894139ebb6`
- **ethos_underclaim** `297e30173ffe0aee` Freezywater St George's CofE VA Primary School (URN `102031`)
  - area `ethos`; flag `possible_underclaim`; source `qualitative-spotcheck-latest`
  - Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells
  - excerpts: church of england, our values, our vision
  - review:
    - `npm run enrich:qualitative -- --urn 102031`
    - `npm run review:human-gated -- --mark-done 297e30173ffe0aee`
- **ethos_underclaim** `8342332e2a8f790e` Queenborough School and Nursery (URN `147749`)
  - area `ethos`; flag `possible_underclaim`; source `qualitative-spotcheck-latest`
  - Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells
  - excerpts: our vision
  - review:
    - `npm run enrich:qualitative -- --urn 147749`
    - `npm run review:human-gated -- --mark-done 8342332e2a8f790e`
- **ethos_underclaim** `05765979e6a767e9` Bishop Douglass School Finchley (URN `143082`)
  - area `ethos`; flag `possible_underclaim`; source `qualitative-spotcheck-latest`
  - Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells
  - excerpts: catholic
  - review:
    - `npm run enrich:qualitative -- --urn 143082`
    - `npm run review:human-gated -- --mark-done 05765979e6a767e9`
- **ethos_underclaim** `1c861310d7447668` St Anne's Catholic Primary School (URN `147519`)
  - area `ethos`; flag `possible_underclaim`; source `qualitative-spotcheck-latest`
  - Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells
  - excerpts: faithful, let all you do, our mission, our vision
  - review:
    - `npm run enrich:qualitative -- --urn 147519`
    - `npm run review:human-gated -- --mark-done 1c861310d7447668`
- **ethos_underclaim** `2ad04055c6d5ebef` Earlsfield Primary School (URN `101005`)
  - area `ethos`; flag `possible_underclaim`; source `qualitative-spotcheck-latest`
  - Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells
  - excerpts: our values, our vision, rights respecting
  - review:
    - `npm run enrich:qualitative -- --urn 101005`
    - `npm run review:human-gated -- --mark-done 2ad04055c6d5ebef`
- **ethos_underclaim** `7d21b4f2e7266a53` Millais School (URN `126066`)
  - area `ethos`; flag `possible_underclaim`; source `qualitative-spotcheck-latest`
  - Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells
  - excerpts: our mission
  - review:
    - `npm run enrich:qualitative -- --urn 126066`
    - `npm run review:human-gated -- --mark-done 7d21b4f2e7266a53`
- **ethos_underclaim** `b95cf95d690bc057` Stafford Junior School (URN `148724`)
  - area `ethos`; flag `possible_underclaim`; source `qualitative-spotcheck-latest`
  - Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells
  - excerpts: be the best you can be, our mission, our values, our vision
  - review:
    - `npm run enrich:qualitative -- --urn 148724`
    - `npm run review:human-gated -- --mark-done b95cf95d690bc057`
- **ethos_underclaim** `f3785dae97da18cb` Herschel Grammar School (URN `137726`)
  - area `ethos`; flag `possible_underclaim`; source `qualitative-spotcheck-latest`
  - Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells
  - excerpts: catholic, church of england
  - review:
    - `npm run enrich:qualitative -- --urn 137726`
    - `npm run review:human-gated -- --mark-done f3785dae97da18cb`
- **unsupported_offerings** `45b485a1d8d12e8d` Platanos College (URN `136450`)
  - flag `unsupported_offerings`; source `qualitative-spotcheck-latest`
  - Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check)
  - excerpts: curriculum: Healthy Body Healthy, curriculum: Electrolysis, curriculum: Photosynthesis, curriculum: Radioactivity, curriculum: Reproduction
  - review:
    - `npm run enrich:qualitative -- --urn 136450`
    - `npm run review:human-gated -- --mark-done 45b485a1d8d12e8d`
- **unsupported_offerings** `f9c3b8ec657089f6` Rose Green Junior School (URN `141600`)
  - flag `unsupported_offerings`; source `qualitative-spotcheck-latest`
  - Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check)
  - excerpts: curriculum: computing, curriculum: geography, curriculum: Dreams and Goals, curriculum: Online Relationships Healthy Eating, curriculum: Foreign Language Overview
  - review:
    - `npm run enrich:qualitative -- --urn 141600`
    - `npm run review:human-gated -- --mark-done f9c3b8ec657089f6`
- **unsupported_offerings** `0b04a912923f24f3` Freezywater St George's CofE VA Primary School (URN `102031`)
  - flag `unsupported_offerings`; source `qualitative-spotcheck-latest`
  - Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check)
  - excerpts: curriculum: Forces and Magnets, curriculum: GEOMETRY Properties of, curriculum: photography, ethos: mission
  - review:
    - `npm run enrich:qualitative -- --urn 102031`
    - `npm run review:human-gated -- --mark-done 0b04a912923f24f3`
- **unsupported_offerings** `1ce4263f617a75df` Littlegreen Academy (URN `146274`)
  - flag `unsupported_offerings`; source `qualitative-spotcheck-latest`
  - Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check)
  - excerpts: curriculum: photography, curriculum: computing, curriculum: Considering Scientific, Recognise, curriculum: Focus: Coherence and Progression, curriculum: physical education
  - review:
    - `npm run enrich:qualitative -- --urn 146274`
    - `npm run review:human-gated -- --mark-done 1ce4263f617a75df`
- **unsupported_offerings** `33e1fd97aa3d8204` Queenborough School and Nursery (URN `147749`)
  - flag `unsupported_offerings`; source `qualitative-spotcheck-latest`
  - Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check)
  - excerpts: enrichment: musical theatre club, enrichment: their most famous piece of music, enrichment: choir, send: Mainstream Core Standards, community: choir
  - review:
    - `npm run enrich:qualitative -- --urn 147749`
    - `npm run review:human-gated -- --mark-done 33e1fd97aa3d8204`
- **unsupported_offerings** `999cf56455c18cfa` Bullers Wood School (URN `136709`)
  - flag `unsupported_offerings`; source `qualitative-spotcheck-latest`
  - Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check)
  - excerpts: curriculum: computer science, curriculum: respect, curriculum: employment in areas of medical science, curriculum: mathematics, enrichment: respect
  - review:
    - `npm run enrich:qualitative -- --urn 136709`
    - `npm run review:human-gated -- --mark-done 999cf56455c18cfa`
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
- **unsupported_offerings** `367074e04b57b8d0` Herschel Grammar School (URN `137726`)
  - flag `unsupported_offerings`; source `qualitative-spotcheck-latest`
  - Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check)
  - excerpts: enrichment: choir
  - review:
    - `npm run enrich:qualitative -- --urn 137726`
    - `npm run review:human-gated -- --mark-done 367074e04b57b8d0`
- **unsupported_offerings** `935d89bb9f75340c` Bishop Douglass School Finchley (URN `143082`)
  - flag `unsupported_offerings`; source `qualitative-spotcheck-latest`
  - Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check)
  - excerpts: enrichment: chess, enrichment: tournaments (chess, enrichment: musical theatre)
  - review:
    - `npm run enrich:qualitative -- --urn 143082`
    - `npm run review:human-gated -- --mark-done 935d89bb9f75340c`
- **unsupported_offerings** `d3915f61c0db92cb` St Anne's Catholic Primary School (URN `147519`)
  - flag `unsupported_offerings`; source `qualitative-spotcheck-latest`
  - Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check)
  - excerpts: enrichment: music, enrichment: music lovers, community: swimming, community: basketball, community: Helpline. Dedicated NSPCC
  - review:
    - `npm run enrich:qualitative -- --urn 147519`
    - `npm run review:human-gated -- --mark-done d3915f61c0db92cb`
- **unsupported_offerings** `eea42b2497853cf2` Brookfield Junior School (URN `118869`)
  - flag `unsupported_offerings`; source `qualitative-spotcheck-latest`
  - Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check)
  - excerpts: curriculum: mathematics, enrichment: after school club, enrichment: range of after school clubs, enrichment: science club, enrichment: drama
  - review:
    - `npm run enrich:qualitative -- --urn 118869`
    - `npm run review:human-gated -- --mark-done eea42b2497853cf2`

## Artefacts

- Digest JSON: `public/data/packs/human-gated-review-latest.json`
- Digest MD: `public/data/packs/human-gated-review-latest.md`
- Durable queue: `output/human-gated-review-queue.jsonl`

## Notes

- GitHub [user-improvement] issues: none or gh unavailable
- No spotcheck gated JSONL yet (expects output/spotcheck-human-gated-candidates.jsonl after auto-learn PR)
