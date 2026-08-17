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

| Block | Endpoint | Action | Paged | Loop ends on |
| :---- | :------- | :----- | :---: | :--- |
| `items-get` | `itembank/items` | `get` | yes | `meta.next` **absent** |
| `responses-get` | `sessions/responses` | `get` | yes | an **empty page** |

Only these two of the Data API's 57 operations are modelled. A request for any other —
writes, duplicates, the async job family, `sessions/scores` — must be declined, not
answered with the nearest built thing.

## `paging` is a required declaration

`EXHAUSTIVE` reads the whole result set; `SINGLE-PAGE` deliberately takes one page and
accepts an incomplete result. It is design intent and never appears in a request. On a
paged block its absence is a HOLE — do not choose a policy the request did not state.

## Request fields of `items-get`

| Field | Learnosity path | Type |
| :---- | :-------------- | :--- |
| `references` | `references` | list of strings (max 1000) |
| `status` | `status` | list of `"published"` `"unpublished"` `"archived"` |
| `created-by` | `created_by` | list of strings |
| `scoring-type` | `scoring_type` | `per-question` `per-dichotomous` `dependent` |
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
| `sort` | `sort` | `asc` `desc` |
| `sort-field` | `sort_field` | `created` `updated` `reference` `title` |
| `mintime` / `maxtime` | `mintime` / `maxtime` | Unix integer or ISO 8601 string |
| `limit` | `limit` | number (max 50 — above it is silently clamped) |
| `next` | `next` | string — a cursor the API RETURNS, not a value to author |

## Request fields of `responses-get`

| Field | Learnosity path | Type |
| :---- | :-------------- | :--- |
| `session-id` | `session_id` | list of strings (max 1000) |
| `user-id` | `user_id` | list of strings (max 1000) |
| `activity-id` | `activity_id` | list of strings (max 1000) |
| `status` | `status` | list of `"Incomplete"` `"Completed"` `"Discarded"` `"Pending Scoring"` |
| `mintime` / `maxtime` | `mintime` / `maxtime` | session UPDATED time |
| `mintime-started` / `maxtime-started` | `mintime_started` / `maxtime_started` | session START time |
| `mintime-completed` / `maxtime-completed` | `mintime_completed` / `maxtime_completed` | SUBMISSION time |
| `include-session-metadata` | `include.sessions.session_metadata` | list of strings |
| `sort` | `sort` | `asc` `desc` |
| `limit` | `limit` | number (max 50) |
| `next` | `next` | string — a cursor the API RETURNS, not a value to author |

`status` here is a SESSION status, disjoint from the Item statuses `items-get` accepts.
The same keyword means different things in different blocks, which is why fields are
scoped to their block: a field the block does not define is a parse error.

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
    sort desc
    sort-field created
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

## Canonical Learnosity Data API knowledge (the recipe draws on this)

### The evidence convention

Read this before adding anything below it.

- A fact marked **[verified]** was exercised END TO END, and the marking says what
  exercised it — a live request, a specific SDK version, a dated run. "It is in the
  documentation" is not verification, and neither is "it worked once in a way that would
  also have worked if the mechanism were inert."
- A fact marked **[documented]** is read off Learnosity's published reference and has NOT
  been confirmed against a live consumer. Present it to the reader as documented, not as
  established. Carry it — a documented behaviour is useful even unconfirmed — but never
  let the recipe's confidence outrun it.
- The paging and transport sections below were exercised against Learnosity's **public demo
  consumer** (`yis0TYCu7U9V4o7M`) on 2026-08-13, using `learnosity-sdk-nodejs` 0.7.0 against
  `v2025.2.LTS` (which reported `meta.versions.concrete` `v1.79.5`). Those facts carry
  **[verified]** with that provenance. Everything else is still **[documented]**.
- A verified fact is verified for the DEMO ITEM BANK. It says the mechanism behaves that
  way; it does not say the reader's own consumer, bank or LTS version does.

### What makes this API different from L0177's

Architectural, not empirical, and it determines which of L0177's rules may be reused.

- **Server-to-server.** No browser, no DOM anchor, no `readyListener`/`errorListener`.
  `security.domain` exists but does NOT mean what it means in L0177, where it is the host
  serving the editor and a mismatch is the #1 cause of a failed init. Here it is the
  domain of the app making the call, and Learnosity's own examples use `localhost` for
  local development. Do not carry L0177's domain-match rule across.
- **It does not fail open.** The Author API silently ignores an unrecognised `config` key,
  which is why every L0177 verification step must be differential. The Data API reports
  errors in the response envelope. **Do not copy the differential apparatus into this
  dialect** — it is a remedy for a failure mode this API does not have, and importing it
  would manufacture ceremony that teaches a reader nothing.
- **The real trap here is silent incompleteness, not silent non-enforcement.** See Paging.

### 1. Signing and transport

- **Endpoint URL is VERSIONED [verified]**:
  `https://data.learnosity.com/{LTS_VERSION}/{endpoint}`, e.g.
  `https://data.learnosity.com/v2025.2.LTS/itembank/items`. This is the OPPOSITE of the
  Author API, which must be loaded from its bare host — the two dialects give
  contradicting advice for what looks like the same mistake, so do not generalise across
  them.
- **⚠ Dropping the version gives a 404 whose body is NOT JSON [verified].**
  `https://data.learnosity.com/itembank/items` returns HTTP 404 with the plain-text body
  `Invalid request, see https://help.learnosity.com for further information`. Every
  successful response and every API-level error is JSON, so client code that calls
  `.json()` unconditionally throws a parse error here — and the developer debugs their
  JSON handling instead of their URL. Check the status before parsing.
- **The Data API is not a REST API.** Every call is a `POST`, whatever the operation. The
  verb lives in the `action` body parameter (`get`, `set`, `update`, `delete`), not in the
  HTTP method.
- **Body content type is `application/json`.**
- **The official SDK is mandatory** — it provides the signature generation. Node.js, PHP,
  ASP.NET, Python, Java and Ruby are published. The call shape is
  `DataApi().request(url, securityPacket, consumerSecret, requestBody, action)`
  **[verified — learnosity-sdk-nodejs 0.7.0]**, where `action` defaults to `get`. The Node
  SDK also exposes `requestIter` and `resultsIter`, which page internally; prefer them to a
  hand-written loop where the host language offers an equivalent.
- **`security`** = `{ consumer_key, domain, timestamp, signature }`. The consumer
  **secret** signs the request and is never part of what you send.
- **The signature covers the SERIALIZED request.** Re-serializing or reordering keys after
  signing invalidates it. Carried over from L0177, where an implementer hit exactly this —
  it is the one signing invariant expected to hold across every Learnosity API, but it has
  not been confirmed here, so present it as documented.

### 2. Paging — the section that matters most

This is why the dialect exists. **A truncated read is indistinguishable from a complete
one unless you look for it.** Every claim in this section was measured against the demo
Item bank.

- A paged response carries a token at **`meta.next` [verified]**. Pass it back with the
  *original* request parameters to get the following page.
- **⚠ HOW A LOOP TERMINATES IS NOT THE SAME ACROSS ENDPOINTS. There is no universal
  paging loop [verified, both families].** This is the single most important thing in this
  file, and getting it wrong is catastrophic in both directions.

  | Family | `meta.next` behaviour | Terminate on |
  | :-- | :-- | :-- |
  | `itembank/*` | omitted once the result set is exhausted | the **absence** of `meta.next` |
  | `sessions/*` | **always present**, even on a zero-record page | an **empty page** |

  For `itembank/*` [verified]: three known references at `limit: 2` gave page 1 with 2
  records and a `next`, page 2 with 1 record and **no** `next`.

  For `sessions/*` [verified]: one `session_id` at `limit: 10` — a result set of exactly
  one, with nothing beyond it — still returned a `next`. Following that token returned
  **zero records and the SAME `next` token again**. On this family `meta.next` is a
  long-poll resumption cursor, not a more-data flag: you keep it to detect sessions
  created later. **A loop waiting for it to disappear never terminates.**

  Learnosity's reference states half of this — the `sessions/responses` article notes the
  token comes back "regardless of whether additional records exist" and that this "differs
  from other Data API endpoints such as those under the Item bank". It also says the token
  appears "only when the current result set contains results", which the measurement
  contradicts: the empty page carried one. See C15 in `conflict-resolution.md`.

  The compiled output carries `paging_end` (`next-absent` or `empty-page`) per block. Read
  it; never assume.
- **⚠ `meta.records` counts the CURRENT PAGE, not the total match set [verified].**
  Measured over 12 consecutive pages at `limit: 2`: `meta.records` was `2` on every single
  page while 24 distinct Items came back. A caller who reads `records` and stops has a
  number that looks like an answer and is not one.
- **⚠ `limit` above the maximum is SILENTLY CLAMPED, not rejected [verified].** The
  documented maximum for `itembank/items` is 50. Sending `limit: 100` returns HTTP 200,
  `meta.status: true`, `meta.records: 50`, 50 records — **and no error, no warning, and no
  indication anywhere in the response that the limit was changed.**
- **⚠ That clamp composes into a data-loss bug [verified].** Because an over-limit request
  is clamped, *every* page then looks short — 50 returned against a requested 100 — while
  `meta.next` is present the whole time. A loop written as "stop when `data.length <
  limit`" therefore terminates after ONE page and silently discards the rest. This is the
  most dangerous interaction found in the API so far, and it is invisible at every step:
  the request succeeds, the response is well-formed, and the answer is wrong.
- Nothing about a truncated read looks wrong: HTTP 200, `meta.status: true`, a well-formed
  `data` array. This is the Data API's analogue of the Author API's fail-open — and it is
  worse in one respect, because the caller gets a plausible answer rather than an
  unenforced setting.
- Consequently: a procedure that reads a paged endpoint MUST state whether it takes one
  page or loops to exhaustion, **and must use that endpoint's own end-of-data signal**.
  Note the cruel symmetry — "stop when the page is short" is the rule that loses data on
  `itembank/*` and the only correct rule on `sessions/*`. Neither can be stated as a
  universal. The verification step must assert the loop ended for the RIGHT reason, never
  merely that records came back.

### 3. The response envelope

Observed shape **[verified]** — note `versions`, which the reference does not show:

```
{ "meta": { "status": true, "timestamp": 1786650330, "next": "1786606673.368656799",
            "records": 2,
            "versions": { "requested": "v2025.2.LTS", "mapped": "v1.79", "concrete": "v1.79.5" } },
  "data": [ … ] }
```

- **`meta.status`** is the API-level verdict, and it is separate from the HTTP status.
  Check it; an HTTP-level check alone is not enough.
- **`meta.versions` [verified]** reports `requested`, `mapped` and `concrete`. The LTS
  string a caller pins is not the version that served the request — `v2025.2.LTS` mapped to
  `v1.79`, concrete `v1.79.5`. Worth logging: it is what makes "it worked last month"
  diagnosable.
- On failure the envelope carries **`meta.code`**, **`meta.message`** and
  **`meta.request_uuid` [verified]** — the uuid is what Learnosity support will ask for.
  Direct the reader to log all three, not just the HTTP status.
- **A bad signature gives HTTP 403 with `meta.code` 41003 [verified]** — the same code the
  Author API uses. **⚠ Its message is misleading for this API:** it reads "Please check if
  security.domain is the same as location.hostname of the browser", which is front-end
  advice. There is no browser in a Data API call. Tell the reader to read 41003 as "the
  signature did not match" and to check the consumer secret and the serialization, not a
  browser hostname.
- Documented HTTP responses [documented]: **400** missing or erroneous request parameters ·
  **403** incorrect authentication details, *or* reaching the API over HTTP instead of
  HTTPS · **409** conflict with the current state of the resource · **410** gone · **429**
  rate limited · **500** server error.
- **The HTTP-not-HTTPS claim did not reproduce and is UNRESOLVED.** Posting to
  `http://data.learnosity.com/...` returned **400** with `meta.code` 41000 "Missing
  security parameters", not the documented 403 — most likely because the redirect to HTTPS
  dropped the POST body rather than because the API applied a scheme policy. Do not present
  either code as the reliable signature of an HTTP-scheme mistake. Tracked as **C5** in
  `conflict-resolution.md`, which records what would close it.

### 4. Rate limiting [documented]

- Limits are per consumer key, over a **5-second window**. Exceeding one returns **HTTP
  429** with `meta.code` **42000**.
- **Limits are per individual endpoint.** Requests to `[GET] itembank/activities` are not
  counted against `[GET] itembank/items`, and exceeding one endpoint's quota does not
  affect any other.
- Documented quota for `[GET] /itembank/*`: **1000 requests per 5-second window**.
- On a 429, wait the full 5-second window before retrying, and account for other processes
  sharing the consumer key.
- This interacts with paging: exhausting a large result set is a burst of requests to one
  endpoint, which is exactly the shape a per-endpoint quota governs.

### 5. Endpoints and actions [documented]

- Actions are a closed set of four: `get`, `set`, `update`, `delete`.
- **The action verb does not tell you whether an operation writes.**
  `jobs/sessions/scores/subscores` takes action `get` and triggers a subscore
  *recalculation* job. Never infer read-vs-write from the verb; read the operation.
- **`duplicate` is a path, not an action** — `itembank/items/duplicate` takes action `set`.
- The legal request fields depend on the `(endpoint, action)` PAIR, not on the endpoint
  alone. `itembank/items` under `get` takes `references`/`limit`/`next`/`status`/`tags`;
  under `set` it takes an `items` array of definitions. The two share nothing.
- One documented case selects its fields by a field VALUE rather than by the pair:
  `sessions` + `set` is discriminated on `data_format` (`failed_submission` takes a
  base64 string array; `from_template` takes session objects).

### 6. Async operations [documented]

- **13 of the 57 documented operations do not return a result.** They return
  `{ "data": { "job_reference": "…" } }` and complete asynchronously.
- Poll with the **`jobs`** endpoint and action `get`, using the returned `job_reference`.
- Async is a property of the individual operation, **not of a path prefix** — the 13 are
  spread across `itembank/*`, `sessions/*`, `reports/*` and `jobs/*`. Two of them are
  `get` operations (`itembank/offlinepackage`, `jobs/sessions/scores/subscores`).
- Paging and async are disjoint: an operation returns either a page or a `job_reference`,
  never both. A procedure for an async operation has no paging step, and vice versa.
- `itembank/items` + `get` — the operation this dialect currently models — is **paged and
  synchronous**.

### 7. Write safety — recipe content only

L0178 never writes. These are things the recipe must tell a developer, not things this
dialect does.

- Name what an operation persists, and whether re-running it is idempotent.
- `set` on an item bank creates or replaces content that other systems may already be
  serving. Direct experiments at a scratch reference or a duplicate, never at the
  reference the design names.
- Batch sizes are capped (documented maximum 50 entries for `itembank/items` + `set`), so
  a large write is many requests — which brings it under the per-endpoint rate limit.

OUT_OF_SCOPE: authoring item **content** (→ L0176); embedding the Author API authoring
experience (→ L0177); assessment delivery (Items API) and analytics (Reports API) —
separate sibling dialects, neither built; calling the Learnosity API at all (this dialect
is documentation-only and holds no credentials); emitting runnable host-language code (the
recipe is language-neutral).
