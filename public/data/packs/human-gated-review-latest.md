# Human-gated review digest — 2026-11-08T07:25:16+00:00

- Mode: `collate`
- Open items: **20** (queue total `41` · done `7` · ignored `14`)
- New / refreshed this run: `0`
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

- `unsupported_offerings`: 11
- `ethos_underclaim`: 9

## Items

- **ethos_underclaim** `7df4288529bdb735` East Stour Primary School (URN `148991`)
  - area `ethos`; flag `possible_underclaim`; source `qualitative-spotcheck-latest`
  - Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells
  - excerpts: our vision
  - review:
    - `npm run enrich:qualitative -- --urn 148991`
    - `npm run review:human-gated -- --mark-done 7df4288529bdb735`
- **ethos_underclaim** `297e30173ffe0aee` Freezywater St George's CofE VA Primary School (URN `102031`)
  - area `ethos`; flag `possible_underclaim`; source `qualitative-spotcheck-latest`
  - Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells
  - excerpts: church of england, our values, our vision
  - review:
    - `npm run enrich:qualitative -- --urn 102031`
    - `npm run review:human-gated -- --mark-done 297e30173ffe0aee`
- **ethos_underclaim** `7aa275b7c983df62` Yeading Infant and Nursery School (URN `102404`)
  - area `ethos`; flag `possible_underclaim`; source `qualitative-spotcheck-latest`
  - Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells
  - excerpts: our vision
  - review:
    - `npm run enrich:qualitative -- --urn 102404`
    - `npm run review:human-gated -- --mark-done 7aa275b7c983df62`
- **ethos_underclaim** `84741fefb0b8847e` Millbank Gardens Primary Academy (URN `151310`)
  - area `ethos`; flag `possible_underclaim`; source `qualitative-spotcheck-latest`
  - Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells
  - excerpts: our values
  - review:
    - `npm run enrich:qualitative -- --urn 151310`
    - `npm run review:human-gated -- --mark-done 84741fefb0b8847e`
- **ethos_underclaim** `b63111fa83bc2af3` The Hall School (URN `100064`)
  - area `ethos`; flag `possible_underclaim`; source `qualitative-spotcheck-latest`
  - Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells
  - excerpts: our ethos
  - review:
    - `npm run enrich:qualitative -- --urn 100064`
    - `npm run review:human-gated -- --mark-done b63111fa83bc2af3`
- **ethos_underclaim** `937ccef0ffb07d19` Wilbury Primary School (URN `146900`)
  - area `ethos`; flag `possible_underclaim`; source `qualitative-spotcheck-latest`
  - Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells
  - excerpts: our vision
  - review:
    - `npm run enrich:qualitative -- --urn 146900`
    - `npm run review:human-gated -- --mark-done 937ccef0ffb07d19`
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
- **ethos_underclaim** `b95cf95d690bc057` Stafford Junior School (URN `148724`)
  - area `ethos`; flag `possible_underclaim`; source `qualitative-spotcheck-latest`
  - Live pages show distinctive ethos/mission language weakly reflected in product ethos/behaviour cells
  - excerpts: be the best you can be, our mission, our values, our vision
  - review:
    - `npm run enrich:qualitative -- --urn 148724`
    - `npm run review:human-gated -- --mark-done b95cf95d690bc057`
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
- **unsupported_offerings** `d7f5a7ee903c0120` Yeading Infant and Nursery School (URN `102404`)
  - flag `unsupported_offerings`; source `qualitative-spotcheck-latest`
  - Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check)
  - excerpts: enrichment: geography, ethos: ethos, ethos: british values, ethos: respect, ethos: responsibility
  - review:
    - `npm run enrich:qualitative -- --urn 102404`
    - `npm run review:human-gated -- --mark-done d7f5a7ee903c0120`
- **unsupported_offerings** `f20f47f4647866ac` Millbank Gardens Primary Academy (URN `151310`)
  - flag `unsupported_offerings`; source `qualitative-spotcheck-latest`
  - Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check)
  - excerpts: curriculum: dance, curriculum: Alliteration, curriculum: Dreams and Goals., curriculum: Environmental Sounds, curriculum: Light and Dark
  - review:
    - `npm run enrich:qualitative -- --urn 151310`
    - `npm run review:human-gated -- --mark-done f20f47f4647866ac`
- **unsupported_offerings** `1207f337e1784a73` St Paul's Catholic Primary School, Thames Ditton (URN `125212`)
  - flag `unsupported_offerings`; source `qualitative-spotcheck-latest`
  - Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check)
  - excerpts: curriculum: music, curriculum: coding, curriculum: computing, curriculum: photography, curriculum: geography
  - review:
    - `npm run enrich:qualitative -- --urn 125212`
    - `npm run review:human-gated -- --mark-done 1207f337e1784a73`
- **unsupported_offerings** `8d5a6f9a63590de2` St Philip's Catholic Primary School (URN `114569`)
  - flag `unsupported_offerings`; source `qualitative-spotcheck-latest`
  - Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check)
  - excerpts: curriculum: pe attack, curriculum: basketball, curriculum: netball, curriculum: computing, curriculum: geography
  - review:
    - `npm run enrich:qualitative -- --urn 114569`
    - `npm run review:human-gated -- --mark-done 8d5a6f9a63590de2`
- **unsupported_offerings** `48cbcdb5897e614e` Ray Lodge Primary School (URN `145045`)
  - flag `unsupported_offerings`; source `qualitative-spotcheck-latest`
  - Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check)
  - excerpts: curriculum: expressive art, curriculum: Full Curriculum Overview, curriculum: Reflection Celebration Evaluation, curriculum: Chanting and Tuned, curriculum: Fairy Tales: Timbre
  - review:
    - `npm run enrich:qualitative -- --urn 145045`
    - `npm run review:human-gated -- --mark-done 48cbcdb5897e614e`
- **unsupported_offerings** `6c6c3bb1da3ad305` St Thomas of Canterbury Catholic Primary School (URN `147431`)
  - flag `unsupported_offerings`; source `qualitative-spotcheck-latest`
  - Offerings not clearly supported by fetched live page text (may be PDF-only evidence — human check)
  - excerpts: enrichment: PE and Sports Funding, enrichment: after school club, enrichment: holiday club, send: Busenya Partnership, send: after school club
  - review:
    - `npm run enrich:qualitative -- --urn 147431`
    - `npm run review:human-gated -- --mark-done 6c6c3bb1da3ad305`

## Artefacts

- Digest JSON: `public/data/packs/human-gated-review-latest.json`
- Digest MD: `public/data/packs/human-gated-review-latest.md`
- Durable queue: `output/human-gated-review-queue.jsonl`

## Notes

- GitHub [user-improvement] issues: none or gh unavailable
- Downgraded 1 unsupported_offerings row(s) to digest-only (no PDF confirmation)
- No spotcheck gated JSONL yet (expects output/spotcheck-human-gated-candidates.jsonl after auto-learn PR)
