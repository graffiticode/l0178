<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# L0178 Vocabulary

This specification documents dialect-specific functions available in the
**L0178** language of Graffiticode. These functions extend the core language
with additional functionality tailored to L0178 use cases.

The core language specification including the definition of its syntax,
semantics and base library can be found here:
[Graffiticode Language Specification](./graffiticode-language-spec.html)

## Structure

A program is one `data-job` head carrying a paging policy and exactly one block
function, terminated with `{}` then `..`.

| Construct | Arity | Shape |
| :-------- | :---: | :---- |
| `data-job` | 1 | Head; takes the whole property + block chain. |
| Blocks: `items-get` `items-set` `responses-get` `jobs-get` `offlinepackage-get` | 2 | Take a `[list]` of request fields; select the endpoint and action. |
| `paging` | 2 | Design intent: `EXHAUSTIVE` or `SINGLE-PAGE`. Never sent in a request. |
| Request fields | 2 | `name value`, chained; the chain ends with `{}`. |

## Blocks

One keyword per `(endpoint, action)` pair. A field's legality depends on the pair, not
on the endpoint alone.

| Block | Endpoint | Action | Paged | Ends on | Async |
| :---- | :------- | :----- | :---: | :--- | :---: |
| `items-get` | `itembank/items` | `get` | yes | `meta.next` absent | no |
| `responses-get` | `sessions/responses` | `get` | yes | an empty page | no |
| `jobs-get` | `jobs` | `get` | no | — | no |
| `offlinepackage-get` | `itembank/offlinepackage` | `get` | no | — | **yes** |
| `items-set` | `itembank/items` | `set` | no | — | no |

The two disagree about how a paged read finishes, and each family's rule is a bug in the
other — see Paging below. The compiled output carries `paging_end` so the recipe branches
rather than assuming.

## Request fields of `items-get`

Each field's exact Learnosity path is recorded in the compiled output's `paths` map,
because the kebab name alone is ambiguous about its separator.

| Field | Learnosity path | Type |
| :---- | :-------------- | :--- |
| `references` | `references` | list of strings (max 1000) |
| `status` | `status` | `published` `unpublished` `archived` |
| `created-by` | `created_by` | list of strings |
| `scoring-type` | `scoring_type` | `per-question` `per-dichotomous` `dependent` |
| `item-pool-id` | `item_pool_id` | string |
| `organisation-id` | `organisation_id` | number |
| `authoring-workflow-reference` | `authoring_workflow.reference` | string |
| `authoring-workflow-states` | `authoring_workflow.states` | list of strings |
| `questions-references` | `questions.references` | list of strings (max 1000) |
| `questions-types` | `questions.types` | list of strings |
| `tags` | `tags` | TagsV2 records `{type, name?}` |
| `advanced-tags-all` | `advanced_tags.all` | TagsV2 records |
| `advanced-tags-either` | `advanced_tags.either` | TagsV2 records |
| `advanced-tags-none` | `advanced_tags.none` | TagsV2 records |
| `include-items` | `include.items` | response properties to return |
| `sort` | `sort` | `asc` `desc` |
| `sort-field` | `sort_field` | `created` `updated` `reference` `title` |
| `mintime` | `mintime` | Unix integer or ISO 8601 string |
| `maxtime` | `maxtime` | Unix integer or ISO 8601 string |
| `limit` | `limit` | number (max 50) |
| `next` | `next` | string — a cursor the API returns, not a value to author |

## Request fields of `responses-get`

| Field | Learnosity path | Type |
| :---- | :-------------- | :--- |
| `session-id` | `session_id` | list of strings (max 1000) |
| `user-id` | `user_id` | list of strings (max 1000) |
| `activity-id` | `activity_id` | list of strings (max 1000) |
| `status` | `status` | `Incomplete` `Completed` `Discarded` `Pending Scoring` |
| `mintime` / `maxtime` | `mintime` / `maxtime` | session UPDATED time |
| `mintime-started` / `maxtime-started` | `mintime_started` / `maxtime_started` | session START time |
| `mintime-completed` / `maxtime-completed` | `mintime_completed` / `maxtime_completed` | SUBMISSION time |
| `include-session-metadata` | `include.sessions.session_metadata` | list of strings |
| `sort` | `sort` | `asc` `desc` |
| `limit` | `limit` | number (max 50) |
| `next` | `next` | string — a cursor the API returns, not a value to author |

Note `status` here is a SESSION status, disjoint from the Item statuses `items-get`
accepts. The same keyword means different things in different blocks, which is why
fields are scoped to their block.

## Request fields of `jobs-get`

| Field | Learnosity path | Type |
| :---- | :-------------- | :--- |
| `references` | `references` | list of job references (max 1000) |
| `status` | `status` | `"queued"` `"running"` `"halted"` `"completed"` |
| `include` | `include` | list of strings |
| `organisation-id` | `organisation_id` | number |
| `mintime` / `maxtime` | `mintime` / `maxtime` | job CREATED time |
| `limit` | `limit` | number (max 50) |

## Request fields of `offlinepackage-get`

| Field | Learnosity path | Type |
| :---- | :-------------- | :--- |
| `organisation-id` | `organisation_id` | number |
| `activity-references` | `activity_references` | list of strings (max 1000) |
| `items` | `items` | list of records `{id, reference, organisation-id?}`; `reference` required |
| `base-directory` | `base_directory` | string |

## Request fields of `items-set` (WRITES)

| Field | Learnosity path | Type |
| :---- | :-------------- | :--- |
| `organisation-id` | `organisation_id` | number |
| `items` | `items` | list of records, max 50; each needs `reference` and `definition` |

Entry keys: `reference`, `new-reference`, `title`, `description`, `source`, `note`, `status`,
`tags`, `features`, `questions`, `metadata-acknowledgements`, `metadata-scoring-type`,
`adaptive-difficulty`, `authoring-workflow-reference`, `authoring-workflow-state`, plus the
unmodelled `definition`, `dynamic-content-data`, `workflow`.

**`set` replaces rather than merges** — a field omitted from the payload is cleared. `status`
defaults to `unpublished`, which makes the Item undeliverable. `definition` is required, carries
item content this dialect does not model, and passes through unchecked.

## Async

`offlinepackage-get` returns a job reference instead of a result, so it is neither paged nor
does it take a paging policy. The compiled output sets `async` and names the redemption
channel in `poll_with`; poll `jobs-get` until the job reaches `completed` or `halted`.

Note `offlinepackage-get` is an async **`get`** — the action verb says nothing about what an
operation does.

## Paging

`paging` is required on a paged block. `EXHAUSTIVE` reads the whole result set;
`SINGLE-PAGE` deliberately takes one page and accepts an incomplete result. The policy
is design intent and never appears in a request.

**How the loop ends is per-endpoint, not universal.** On `itembank/*`, `meta.next` is
omitted once the result set is exhausted, and page size proves nothing (an over-limit
`limit` is silently clamped, so pages can look short while data remains). On
`sessions/*`, `meta.next` is *always* present — it is a long-poll resumption cursor, and
it comes back even on a zero-record page — so the loop must end on an empty page or it
never ends at all. Read `paging_end` from the compiled output.
