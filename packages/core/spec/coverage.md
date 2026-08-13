<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# L0178 coverage ledger — the Learnosity Data API surface

This is the **denominator**. L0177's credibility rests on being able to say every emitted path
was cross-checked against the published reference, and that sentence is only available against a
known total. This file is that total, so each slice L0178 builds can report progress against it.

It is a map, not knowledge. Everything here is read off Learnosity's published reference — see
"Provenance" below — and **nothing in it is verified**. It records the shape of the API, not how
the API behaves. The un-written tricks that make this dialect worth having are, by definition,
not in the documentation; they come from building and running.

## Totals

| | |
| :-- | --: |
| Endpoints | **40** |
| `(endpoint, action)` blocks | **57** |
| Documented parameters (incl. nested) | ~576 |
| Blocks returning a paged result | 13 |
| Blocks that create an async job | 13 |

Actions are exactly four: `get` (28), `set` (20), `update` (8), `delete` (1).

## What the map settled

**1. `duplicate` is a PATH, not an action.** `itembank/items/duplicate` takes action `set`. The
action vocabulary is closed at four verbs, which keeps the registry's second axis small.

**2. The action name does NOT tell you whether an operation writes.** `jobs/sessions/scores/subscores`
takes action **`get`** and triggers a subscore *recalculation* job. Any read/write classification
must come from the operation's own description, never from its verb. This is why the ledger has no
R/W column: a derived one would have been wrong and would have looked authoritative.

**3. `(endpoint, action)` is the right key, but a block may carry VARIANTS.** Field sets are
genuinely disjoint across actions on one endpoint — `itembank/items` under `get` takes
`references`/`limit`/`next`/`status`/`tags`/`include`, under `set` an `items` array of definitions.
That is why the key needs two levels. The one apparent counter-example resolved cleanly: `sessions`
+ `set` is a **discriminated union on `data_format`**, not a third axis —

| `data_format` | `data` | Also takes | Article |
| :-- | :-- | :-- | :-- |
| `failed_submission` | `array[string]` of base64 session blobs | `ignore_response_revisions` | `26076336091933` |
| `from_template` | `array[object]` of sessions + responses | — | `26076278679069` |

Same endpoint, same action, disjoint fields, selected by a field *value*. Model it as a variant
inside the `(sessions, set)` block keyed on `data_format`. **The registry stays two-level.**

**4. Async is a MODE, not a second head — and `jobs` is the shared polling channel.** 13 blocks
create a long-running job and return `{ data: { job_reference } }`, to be polled with `jobs` +
`get`. They are spread across `itembank/*`, `sessions/*`, `reports/*` and `jobs/*` — async is a
property of the individual operation, not of a path prefix, so it cannot be modelled by giving
`jobs/*` its own head. Two of the 13 are `get` blocks (`itembank/offlinepackage`,
`jobs/sessions/scores/subscores`), both verified by reading their response sections.

**5. Paging and async are disjoint concerns.** 13 blocks page, 13 create jobs, and no block does
both. A read either returns a page (with `meta.next`) or a `job_reference`, never both.

## The scope boundary — OPEN, needs a decision

The `sessions/*` and `reports/*` groups (19 blocks) are Data API endpoints that read assessment
RESULTS — responses, scores, statuses, adaptive reports, datasets. They sit squarely between this
dialect and the future Reports API dialect. Three options, none yet chosen:

- L0178 covers all of Data API, and the Reports dialect covers only the Reports *API*
- L0178 covers `itembank/*` + `jobs/*`, and the results endpoints go with the Reports dialect
- L0178 covers everything except results *writes*

The `itembank/*` group (31 blocks including tags) is unambiguously L0178. Start there regardless
of how the boundary lands, which is what makes `itembank/items` a safe first branch.

## Provenance

Extracted from Learnosity's Zendesk help centre on 2026-08-13 — 56 Data API articles of 2,166
total. `help.learnosity.com` 403s WebFetch and curl, but the Zendesk API underneath is open:

```bash
curl -s "https://help.learnosity.com/api/v2/help_center/en-us/articles.json?per_page=100&page=N"
curl -s "https://help.learnosity.com/api/v2/help_center/en-us/articles/<id>.json"   # -> .article.body
```

Endpoint articles are titled `<Endpoint> - Endpoints - Data API`; error codes are
`<HTTP code> - Troubleshooting - Data API`. The `Source article` column below is the Zendesk id,
so any row can be re-read at its source. Parameter counts include nested properties and are for
SIZING ONLY — do not treat them as a field list.

Two extraction traps, both hit and fixed, both worth knowing before re-deriving this table: several
articles embed an `Example Response:` *inside* a parameter description, which truncates the
parameter section early (it put `itembank/questions get` at 6 params instead of 16); and an action
block's text runs on into the next operation's prose, so scanning a whole block for `job_reference`
marks every operation in a mixed article as async. Bound the parameter section on the
`Responses`/`Response example` header, and the async check on a short window after it.

## The ledger

### itembank  (25 blocks, 16 endpoints) — L0178 core

| Endpoint | Action | Paged | Async | Params | Source article |
| :-- | :-- | :-: | :-: | --: | :-- |
| `itembank/activities` | `get` | yes | — | 23 | `26076378893725` |
| `itembank/activities` | `set` | — | — | 22 | `26076378893725` |
| `itembank/activities/duplicate` | `set` | — | **job** | 14 | `26076378893725` |
| `itembank/activities/tags` | `set` | — | — | 12 | `26076378932765` |
| `itembank/activities/tags` | `update` | — | — | 12 | `26076378932765` |
| `itembank/activities/templates` | `get` | — | — | 1 | `26076390673565` |
| `itembank/features` | `get` | yes | — | 17 | `26076399481501` |
| `itembank/features` | `set` | — | — | 13 | `26076399481501` |
| `itembank/features/duplicate` | `set` | — | — | 10 | `26076399481501` |
| `itembank/items` | `get` | yes | — | 24 | `26076386828189` |
| `itembank/items` | `set` | — | — | 32 | `26076386828189` |
| `itembank/items/duplicate` | `set` | — | — | 13 | `26076386828189` |
| `itembank/items/tags` | `set` | — | — | 12 | `26076399449757` |
| `itembank/items/tags` | `update` | — | — | 13 | `26076399449757` |
| `itembank/offlinepackage` | `get` | — | **job** | 5 | `26076363707421` |
| `itembank/playertemplates` | `get` | — | — | 1 | `26076390673565` |
| `itembank/pools` | `get` | yes | — | 8 | `26076363663005` |
| `itembank/pools` | `set` | — | **job** | 17 | `26076363663005` |
| `itembank/pools` | `update` | — | **job** | 16 | `26076363663005` |
| `itembank/questions` | `get` | yes | — | 16 | `26076378985629` |
| `itembank/questions` | `set` | — | — | 13 | `26076378985629` |
| `itembank/questions/duplicate` | `set` | — | — | 10 | `26076378985629` |
| `itembank/upload/assets` | `get` | — | — | 5 | `26076399578397` |
| `itembank/workflows` | `get` | yes | — | 5 | `26076399599005` |
| `itembank/workflows` | `set` | — | — | 12 | `26076399599005` |

### itembank-tags  (6 blocks, 4 endpoints) — L0178 core

| Endpoint | Action | Paged | Async | Params | Source article |
| :-- | :-- | :-: | :-: | --: | :-- |
| `itembank/tagging/hierarchies` | `get` | — | — | 2 | `26076373806749` |
| `itembank/tagging/hierarchies/nodes` | `get` | — | — | 3 | `26076373806749` |
| `itembank/tagging/tags` | `get` | yes | — | 9 | `26076379042589` |
| `itembank/tagging/tags` | `set` | — | — | 14 | `26076379042589` |
| `itembank/tags` | `get` | — | — | 4 | `26076379042589` |
| `itembank/tags` | `set` | — | — | 3 | `26076379042589` |

### jobs  (5 blocks, 5 endpoints) — L0178 — async polling channel

| Endpoint | Action | Paged | Async | Params | Source article |
| :-- | :-- | :-: | :-: | --: | :-- |
| `jobs` | `get` | — | — | 10 | `26076318439197` |
| `jobs/reports/datasets` | `set` | — | **job** | 2 | `26076335897757` |
| `jobs/sessions/metadata` | `set` | — | **job** | 5 | `26076304349213` |
| `jobs/sessions/scores/subscores` | `get` | — | **job** | 1 | `26076310392861` |
| `jobs/sessions/statuses` | `update` | — | **job** | 4 | `26076335907869` |

### sessions  (16 blocks, 11 endpoints) — BOUNDARY — results surface

| Endpoint | Action | Paged | Async | Params | Source article |
| :-- | :-- | :-: | :-: | --: | :-- |
| `sessions` | `delete` | — | **job** | 1 | `26076304588445` |
| `sessions` | `set` | — | **job** | 28 | `26076278679069` |
| `sessions` | `set` | — | **job** | 4 | `26076336091933` |
| `sessions/item` | `update` | — | **job** | 6 | `26076318688925` |
| `sessions/metadata` | `get` | yes | — | 15 | `26076336114461` |
| `sessions/reports/adaptive` | `get` | yes | — | 15 | `26076304443165` |
| `sessions/responses` | `get` | yes | — | 17 | `26076304385565` |
| `sessions/responses/feedback` | `get` | — | — | 1 | `27824043349661` |
| `sessions/responses/feedback` | `update` | — | — | 10 | `27824043349661` |
| `sessions/responses/scores` | `get` | yes | — | 15 | `26076278639389` |
| `sessions/responses/scores` | `update` | — | **job** | 12 | `26076278639389` |
| `sessions/responses/scores/grading` | `get` | — | — | 1 | `37621876726813` |
| `sessions/responses/scores/grading` | `update` | — | — | 10 | `37621876726813` |
| `sessions/scores` | `get` | yes | — | 17 | `26076278627869` |
| `sessions/statuses` | `get` | yes | — | 17 | `26076351111453` |
| `sessions/templates` | `get` | — | — | 7 | `26076278657821` |

### reports  (3 blocks, 2 endpoints) — BOUNDARY — results surface

| Endpoint | Action | Paged | Async | Params | Source article |
| :-- | :-- | :-: | :-: | --: | :-- |
| `reports/datasets` | `get` | — | — | 4 | `26076304360861` |
| `reports/datasets` | `set` | — | — | 2 | `26076304360861` |
| `scoring` | `get` | — | — | 5 | `26076278598813` |

### misc  (2 blocks, 2 endpoints) — L0178 (fringe)

| Endpoint | Action | Paged | Async | Params | Source article |
| :-- | :-- | :-: | :-: | --: | :-- |
| `assets` | `get` | — | — | 2 | `26076278454301` |
| `consumer/keys/lti` | `set` | — | — | 4 | `26076278463389` |