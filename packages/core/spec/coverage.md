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
| Documented parameters (incl. nested) | ~579 |
| Blocks returning a paged result | 13 |

Actions are exactly four: `get` (28), `set` (20), `update` (8), `delete` (1).

## What the map settled

**1. `duplicate` is a PATH, not an action.** `itembank/items/duplicate` takes action `set`. The
action vocabulary is closed at four verbs, which keeps the registry's second axis small.

**2. `(endpoint, action)` is very nearly the right registry key — with one exception to resolve.**
Field sets are genuinely disjoint across actions on one endpoint, which is the whole reason the
key needs two levels: `itembank/items` under `get` takes `references`/`limit`/`next`/`status`/
`tags`/`include`; under `set` it takes an `items` array of definitions. But `sessions` + `set` is
documented **twice**, by `Template-submission` (article `26076278679069`) and `Failed-submissions`
(article `26076336091933`), with different field sets. Either they are variants keyed on a field
such as `data_format`, or the key needs a third axis. **Resolve this before writing `vocab.ts`** —
it is the one structural question the map could not close.

**3. There are two program shapes, and the second is real.** Most endpoints are synchronous
request-response. The `jobs/*` family is asynchronous: create a long-running job by POSTing to
`jobs/reports/datasets`, `jobs/sessions/metadata` or `jobs/sessions/statuses`, then poll `jobs`
with `get` (which takes `references`, `status`, `limit`, `mintime`/`maxtime`) to check progress
and retrieve results. A head designed around one synchronous request with paging does not model
this. Decide whether it is a second head or a mode of the first.

**4. Paging is a read-side concern, uniformly.** All 13 paged blocks are `get`. No write paginates.

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

## The ledger

### itembank  (25 blocks, 16 endpoints) — L0178 core

| Endpoint | Action | R/W | Paged | Params | Source article |
| :-- | :-- | :-: | :-: | --: | :-- |
| `itembank/activities` | `get` | read | yes | 23 | `26076378893725` |
| `itembank/activities` | `set` | WRITE | — | 22 | `26076378893725` |
| `itembank/activities/duplicate` | `set` | WRITE | — | 14 | `26076378893725` |
| `itembank/activities/tags` | `set` | WRITE | — | 12 | `26076378932765` |
| `itembank/activities/tags` | `update` | WRITE | — | 12 | `26076378932765` |
| `itembank/activities/templates` | `get` | read | — | 1 | `26076390673565` |
| `itembank/features` | `get` | read | yes | 17 | `26076399481501` |
| `itembank/features` | `set` | WRITE | — | 13 | `26076399481501` |
| `itembank/features/duplicate` | `set` | WRITE | — | 10 | `26076399481501` |
| `itembank/items` | `get` | read | yes | 24 | `26076386828189` |
| `itembank/items` | `set` | WRITE | — | 32 | `26076386828189` |
| `itembank/items/duplicate` | `set` | WRITE | — | 13 | `26076386828189` |
| `itembank/items/tags` | `set` | WRITE | — | 12 | `26076399449757` |
| `itembank/items/tags` | `update` | WRITE | — | 13 | `26076399449757` |
| `itembank/offlinepackage` | `get` | read | — | 5 | `26076363707421` |
| `itembank/playertemplates` | `get` | read | — | 1 | `26076390673565` |
| `itembank/pools` | `get` | read | yes | 8 | `26076363663005` |
| `itembank/pools` | `set` | WRITE | — | 17 | `26076363663005` |
| `itembank/pools` | `update` | WRITE | — | 16 | `26076363663005` |
| `itembank/questions` | `get` | read | yes | 16 | `26076378985629` |
| `itembank/questions` | `set` | WRITE | — | 13 | `26076378985629` |
| `itembank/questions/duplicate` | `set` | WRITE | — | 10 | `26076378985629` |
| `itembank/upload/assets` | `get` | read | — | 8 | `26076399578397` |
| `itembank/workflows` | `get` | read | yes | 5 | `26076399599005` |
| `itembank/workflows` | `set` | WRITE | — | 12 | `26076399599005` |

### itembank-tags  (6 blocks, 4 endpoints) — L0178 core

| Endpoint | Action | R/W | Paged | Params | Source article |
| :-- | :-- | :-: | :-: | --: | :-- |
| `itembank/tagging/hierarchies` | `get` | read | — | 2 | `26076373806749` |
| `itembank/tagging/hierarchies/nodes` | `get` | read | — | 3 | `26076373806749` |
| `itembank/tagging/tags` | `get` | read | yes | 9 | `26076379042589` |
| `itembank/tagging/tags` | `set` | WRITE | — | 14 | `26076379042589` |
| `itembank/tags` | `get` | read | — | 4 | `26076379042589` |
| `itembank/tags` | `set` | WRITE | — | 3 | `26076379042589` |

### jobs  (5 blocks, 5 endpoints) — L0178 (async shape)

| Endpoint | Action | R/W | Paged | Params | Source article |
| :-- | :-- | :-: | :-: | --: | :-- |
| `jobs` | `get` | read | — | 10 | `26076318439197` |
| `jobs/reports/datasets` | `set` | WRITE | — | 2 | `26076335897757` |
| `jobs/sessions/metadata` | `set` | WRITE | — | 5 | `26076304349213` |
| `jobs/sessions/scores/subscores` | `get` | read | — | 1 | `26076310392861` |
| `jobs/sessions/statuses` | `update` | WRITE | — | 4 | `26076335907869` |

### sessions  (16 blocks, 11 endpoints) — BOUNDARY — results surface

| Endpoint | Action | R/W | Paged | Params | Source article |
| :-- | :-- | :-: | :-: | --: | :-- |
| `sessions` | `delete` | WRITE | — | 1 | `26076304588445` |
| `sessions` | `set` | WRITE | — | 28 | `26076278679069` |
| `sessions` | `set` | WRITE | — | 4 | `26076336091933` |
| `sessions/item` | `update` | WRITE | — | 6 | `26076318688925` |
| `sessions/metadata` | `get` | read | yes | 15 | `26076336114461` |
| `sessions/reports/adaptive` | `get` | read | yes | 15 | `26076304443165` |
| `sessions/responses` | `get` | read | yes | 17 | `26076304385565` |
| `sessions/responses/feedback` | `get` | read | — | 1 | `27824043349661` |
| `sessions/responses/feedback` | `update` | WRITE | — | 10 | `27824043349661` |
| `sessions/responses/scores` | `get` | read | yes | 15 | `26076278639389` |
| `sessions/responses/scores` | `update` | WRITE | — | 12 | `26076278639389` |
| `sessions/responses/scores/grading` | `get` | read | — | 1 | `37621876726813` |
| `sessions/responses/scores/grading` | `update` | WRITE | — | 10 | `37621876726813` |
| `sessions/scores` | `get` | read | yes | 17 | `26076278627869` |
| `sessions/statuses` | `get` | read | yes | 17 | `26076351111453` |
| `sessions/templates` | `get` | read | — | 7 | `26076278657821` |

### reports  (3 blocks, 2 endpoints) — BOUNDARY — results surface

| Endpoint | Action | R/W | Paged | Params | Source article |
| :-- | :-- | :-: | :-: | --: | :-- |
| `reports/datasets` | `get` | read | — | 4 | `26076304360861` |
| `reports/datasets` | `set` | WRITE | — | 2 | `26076304360861` |
| `scoring` | `get` | read | — | 5 | `26076278598813` |

### misc  (2 blocks, 2 endpoints) — L0178 (fringe)

| Endpoint | Action | R/W | Paged | Params | Source article |
| :-- | :-- | :-: | :-: | --: | :-- |
| `assets` | `get` | read | — | 2 | `26076278454301` |
| `consumer/keys/lti` | `set` | WRITE | — | 4 | `26076278463389` |