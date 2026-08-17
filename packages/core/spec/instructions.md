<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Dialect L0178 — Learnosity Data API cookbook

L0178 describes a **data job** against the Learnosity Data API — which operation to run,
what the request carries, and how far it reads. It never calls the API. The client
describes the job; L0178 validates it, flags holes as steering warnings, and via
`get_spec` returns a host-language-neutral recipe.

## Program shape

A program is one `data-job` head carrying a paging policy and exactly one **block**
function, terminated with `{}` then `..`:

```
data-job
  paging EXHAUSTIVE
  items-get [
    references ["Grade7_ELA_1021" "Grade7_ELA_1022"]
    status ["published"]
    include-items ["dt_created" "dt_updated"]
    organisation-id 123
    limit 50
    {}
  ]
  {}..
```

Uniform rules:
- **`data-job`** is arity 1: it takes the whole property + block chain.
- **Blocks** (`items-get`, `responses-get`) are arity 2 and take a `[list]` of request
  fields. Exactly one block per program.
- **`paging`** is arity 2 and takes `EXHAUSTIVE` or `SINGLE-PAGE` — an UPPERCASE tag, not
  a quoted string.
- **Only `EXHAUSTIVE` and `SINGLE-PAGE` are bare TAG tokens.** EVERY other enumerated value is a
  QUOTED STRING — `sort "desc"`, `sort-field "title"`, `scoring-type "per-dichotomous"`,
  `status ["published"]`. Writing one bare (`sort desc`) is an undefined reference, not a value.
- **Request fields are arity-2 lowercase-kebab functions** — `name value` — that chain;
  a chain ends with `{}`.
- **Everything except the block and the paging policy is optional.** An unfiltered read is
  legal and warns that it reads the whole bank.
- **An unknown property is a parse error**, not a warning. Warnings are reserved for
  values and combinations the compiler accepted but wants to steer.
- Do NOT write `let` bindings, records, or an `endpoint`/`action`/`request` object. The
  operation is chosen by the BLOCK KEYWORD; there is no field that names an endpoint.

## The block selects the operation (one per program)

One keyword per `(endpoint, action)` pair, because a field's legality depends on the pair
rather than on the endpoint alone — and because bare `get` and `set` belong to the base
language.

| Block | Endpoint | Action | Paged | Loop ends on | Async |
| :---- | :------- | :----- | :---: | :--- | :---: |
| `items-get` | `itembank/items` | `get` | yes | `meta.next` **absent** | no |
| `responses-get` | `sessions/responses` | `get` | yes | an **empty page** | no |
| `jobs-get` | `jobs` | `get` | no | — | no |
| `offlinepackage-get` | `itembank/offlinepackage` | `get` | no | — | **yes** |
| `items-set` | `itembank/items` | `set` | no | — | no |

Only these five of the Data API's 57 operations are modelled. A request for any other —
writes, duplicates, `sessions/scores` — must be declined, not answered with the nearest
built thing.

`offlinepackage-get` is an **async `get`**: proof that the action verb says nothing about
what an operation does. It returns a job reference rather than a result. `jobs-get` is the
channel every async operation in the API is redeemed at, and is also a legitimate job on its
own — polling a reference the caller already holds.

## `paging` is a required declaration

`EXHAUSTIVE` reads the whole result set; `SINGLE-PAGE` deliberately takes one page and
accepts an incomplete result. It is design intent and never appears in a request. On a
paged block its absence is a HOLE — do not choose a policy the request did not state.

Two API facts decide which one a request implies, so they belong here rather than only in
the recipe:

- **HOW A LOOP TERMINATES IS NOT THE SAME ACROSS ENDPOINTS.** There is no universal paging
  loop; the table above gives the end-of-data signal per block, and the compiled output
  carries `paging_end`. This is why `paging` is declared and never inferred.
- **`meta.records` counts the CURRENT PAGE, not the total match set.** A request that asks
  how many things match therefore implies `EXHAUSTIVE` — a single page cannot answer it,
  and the number it returns looks like an answer and is not one.

## Request fields of `items-get`

| Field | Learnosity path | Type |
| :---- | :-------------- | :--- |
| `references` | `references` | list of strings (max 1000) |
| `status` | `status` | list of quoted strings: `["published"]` `["unpublished"]` `["archived"]` |
| `created-by` | `created_by` | list of strings |
| `scoring-type` | `scoring_type` | quoted string: `"per-question"` `"per-dichotomous"` `"dependent"` |
| `item-pool-id` | `item_pool_id` | string |
| `organisation-id` | `organisation_id` | number |
| `authoring-workflow-reference` | `authoring_workflow.reference` | string |
| `authoring-workflow-states` | `authoring_workflow.states` | list of strings |
| `questions-references` | `questions.references` | list of strings (max 1000) |
| `questions-types` | `questions.types` | list of strings |
| `tags` | `tags` | TagsV2 records `{type: "…", name: "…"}` |
| `advanced-tags-all` | `advanced_tags.all` | TagsV2 records |
| `advanced-tags-either` | `advanced_tags.either` | TagsV2 records |
| `advanced-tags-none` | `advanced_tags.none` | TagsV2 records |
| `include-items` | `include.items` | list of response properties to return |
| `sort` | `sort` | quoted string: `"asc"` `"desc"` |
| `sort-field` | `sort_field` | quoted string: `"created"` `"updated"` `"reference"` `"title"` |
| `mintime` / `maxtime` | `mintime` / `maxtime` | Unix integer or ISO 8601 string |
| `limit` | `limit` | number (max 50 — above it is silently clamped) |
| `next` | `next` | string — a cursor the API RETURNS, not a value to author |

## Request fields of `responses-get`

| Field | Learnosity path | Type |
| :---- | :-------------- | :--- |
| `session-id` | `session_id` | list of strings (max 1000) |
| `user-id` | `user_id` | list of strings (max 1000) |
| `activity-id` | `activity_id` | list of strings (max 1000) |
| `status` | `status` | list of quoted strings: `["Completed"]` `["Incomplete"]` `["Discarded"]` `["Pending Scoring"]` |
| `mintime` / `maxtime` | `mintime` / `maxtime` | session UPDATED time |
| `mintime-started` / `maxtime-started` | `mintime_started` / `maxtime_started` | session START time |
| `mintime-completed` / `maxtime-completed` | `mintime_completed` / `maxtime_completed` | SUBMISSION time |
| `include-session-metadata` | `include.sessions.session_metadata` | list of strings |
| `sort` | `sort` | quoted string: `"asc"` `"desc"` |
| `limit` | `limit` | number (max 50) |
| `next` | `next` | string — a cursor the API RETURNS, not a value to author |

`status` here is a SESSION status, disjoint from the Item statuses `items-get` accepts.
The same keyword means different things in different blocks, which is why fields are
scoped to their block: a field the block does not define is a parse error.

## Request fields of `jobs-get`

| Field | Learnosity path | Type |
| :---- | :-------------- | :--- |
| `references` | `references` | list of job references (max 1000) |
| `status` | `status` | `"queued"` `"running"` `"halted"` `"completed"` |
| `include` | `include` | list of strings — restricts the properties returned |
| `organisation-id` | `organisation_id` | number |
| `mintime` / `maxtime` | `mintime` / `maxtime` | job CREATED time |
| `limit` | `limit` | number (max 50) |

## Request fields of `offlinepackage-get`

| Field | Learnosity path | Type |
| :---- | :-------------- | :--- |
| `organisation-id` | `organisation_id` | number |
| `activity-references` | `activity_references` | list of strings (max 1000) |
| `items` | `items` | list of records `{id, reference, organisation-id?}`; `reference` required |
| `base-directory` | `base_directory` | string — default `/vendor/itembank` |

Learnosity also documents `item_references` on this endpoint. It is **deprecated** in favour
of `items` and is deliberately not modelled; do not reach for it.

## Request fields of `items-set` (this one WRITES)

| Field | Learnosity path | Type |
| :---- | :-------------- | :--- |
| `organisation-id` | `organisation_id` | number |
| `items` | `items` | list of records, max 50; each needs `reference` and `definition` |

Each entry accepts: `reference`, `new-reference`, `title`, `description`, `source`, `note`,
`status`, `tags`, `features`, `questions`, `metadata-acknowledgements`,
`metadata-scoring-type`, `adaptive-difficulty`, `authoring-workflow-reference`,
`authoring-workflow-state`, and the unmodelled `definition`, `dynamic-content-data` and
`workflow`.

Three things to carry into any request that uses this block:

- **`set` REPLACES an Item.** A field left out of the payload is cleared, not preserved. So
  a request to "change the title" must still send everything else the Item should keep.
- **`status` defaults to `unpublished`**, and an unpublished Item cannot be delivered. If a
  request wants the Item usable, it must say `status: "published"`.
- **`definition` is required and carries item CONTENT**, which this dialect does not model.
  It is passed through unchecked. Content is composed in L0176; this dialect moves it.

## Polling an async operation

When the compiled output has `async: true` there is no result and no paging loop: the
response carries a job reference, and the caller polls `jobs-get` until the job reaches a
terminal status. The output names the channel in `poll_with` — read it rather than
assuming, because async operations are spread across four path families.

So an async request usually implies TWO programs: the producer, and a `jobs-get` to redeem
it. `paging` is not required on either — neither block is paged.

The API facts that make the polling loop correct (where the reference is in the envelope,
and why passing the documented `status` default breaks the poll) are in the canonical
knowledge, not here.

## Warnings are repair signals

The compiler returns `data.warnings` — imperative, specific steering hints. **Holes
(a missing paging policy on a paged block) come first**; once filled, advisories surface
(an unfiltered read, an over-maximum `limit`, a hand-authored `next`). The client reads
them and refines via `update_item` until the job is complete.

## `data.paths` gives the exact Learnosity paths — use them verbatim

Each field's exact path is recorded in the compiled output's `paths` map, because the
kebab name alone cannot say whether a hyphen was a `.` or a `_` (`include-items` is
`include.items`, but `created-by` is `created_by`). The recipe copies those values; it
never derives a path from a field name.

## Examples

One page, for a look at the shape of the data:

```
data-job
  paging SINGLE-PAGE
  items-get [
    status ["archived"]
    organisation-id 4021
    limit 50
    {}
  ]
  {}..
```

Everything matching, newest first:

```
data-job
  paging EXHAUSTIVE
  items-get [
    created-by ["author-99"]
    mintime "2026-01-01"
    sort "desc"
    sort-field "created"
    {}
  ]
  {}..
```

Session responses for one activity, read to exhaustion:

```
data-job
  paging EXHAUSTIVE
  responses-get [
    activity-id ["numeracy"]
    status ["Completed"]
    mintime-completed "2026-01-01"
    {}
  ]
  {}..
```

A request that names no reading intent yields the paging hole rather than a guess:

```
data-job
  items-get [
    status ["published"]
    organisation-id 123
    {}
  ]
  {}..
```
