<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# L0178 — Learnosity Data API cookbook

## The evidence convention

Read this before adding anything below it.

- A fact marked **[verified]** was exercised END TO END, and the marking says what
  exercised it — a live request, a specific SDK version, a dated run. "It is in the
  documentation" is not verification, and neither is "it worked once in a way that would
  also have worked if the mechanism were inert."
- A fact marked **[documented]** is read off Learnosity's published reference and has NOT
  been confirmed against a live consumer. Present it to the reader as documented, not as
  established. Carry it — a documented behaviour is useful even unconfirmed — but never
  let the recipe's confidence outrun it.
- **Everything in this file today is [documented].** No L0178 claim has been exercised
  against a live consumer. Say so when it matters to the reader's decision.

## What makes this API different from L0177's

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

## 1. Signing and transport [documented]

- **Endpoint URL is VERSIONED**: `https://data.learnosity.com/{LTS_VERSION}/{endpoint}`,
  e.g. `https://data.learnosity.com/v2025.2.LTS/itembank/items`. This is the OPPOSITE of
  the Author API, which must be loaded from its bare host — the two dialects give
  contradicting advice for what looks like the same mistake, so do not generalise across
  them.
- **The Data API is not a REST API.** Every call is a `POST`, whatever the operation. The
  verb lives in the `action` body parameter (`get`, `set`, `update`, `delete`), not in the
  HTTP method.
- **Body content type is `application/json`.**
- **The official SDK is mandatory** — it provides the signature generation. Node.js, PHP,
  ASP.NET, Python, Java and Ruby are published. The call shape is
  `DataApi().request(url, securityPacket, consumerSecret, requestBody, action)`.
- **`security`** = `{ consumer_key, domain, timestamp, signature }`. The consumer
  **secret** signs the request and is never part of what you send.
- **The signature covers the SERIALIZED request.** Re-serializing or reordering keys after
  signing invalidates it. Carried over from L0177, where an implementer hit exactly this —
  it is the one signing invariant expected to hold across every Learnosity API, but it has
  not been confirmed here, so present it as documented.

## 2. Paging — the section that matters most [documented]

This is why the dialect exists. **A truncated read is indistinguishable from a complete
one unless you look for it.**

- A paged response carries a token at **`meta.next`**. Pass it back with the *original*
  request parameters to get the following page.
- **`meta.next` is ABSENT when the result set is exhausted.** Its absence is the only
  end-of-data signal.
- **`meta.records` counts the CURRENT PAGE, not the total match set.** A caller who reads
  `records` and stops has a number that looks like an answer and is not one.
- `limit` caps the page size. Documented maximum for `itembank/items`: **50**.
- Nothing about a truncated read looks wrong: HTTP 200, `meta.status: true`, a well-formed
  `data` array. This is the Data API's analogue of the Author API's fail-open — and it is
  worse in one respect, because the caller gets a plausible answer rather than an
  unenforced setting.
- Consequently: a procedure that reads a paged endpoint MUST state whether it takes one
  page or loops to exhaustion, and the verification step must assert **the cursor was
  exhausted**, never merely that records came back.

## 3. The response envelope [documented]

```
{ "meta": { "status": true, "timestamp": 1470291213, "next": "1445216251.1165015", "records": 5 },
  "data": [ … ] }
```

- **`meta.status`** is the API-level verdict, and it is separate from the HTTP status.
  Check it; an HTTP-level check alone is not enough.
- On failure the envelope carries **`meta.code`** and **`meta.message`** — e.g. a 429 body
  is `{"meta": {"status": false, "code": 42000, "message": "Too many requests"}}`. Direct
  the reader to log `code` and `message`, not just the HTTP status.
- Documented HTTP responses: **400** missing or erroneous request parameters · **403**
  incorrect authentication details, *or* reaching the API over HTTP instead of HTTPS ·
  **409** conflict with the current state of the resource · **410** gone · **429** rate
  limited · **500** server error.

## 4. Rate limiting [documented]

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

## 5. Endpoints and actions [documented]

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

## 6. Async operations [documented]

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

## 7. Write safety — recipe content only

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
