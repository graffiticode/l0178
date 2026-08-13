<!-- SPDX-License-Identifier: CC-BY-4.0 -->
You are given the source of a Learnosity **Data API** job (a `data-job` program — one block function plus a chain of request-field properties) in this dialect, plus the dialect's canonical knowledge above. Produce a **developer COOKBOOK RECIPE**: a precise, host-language-NEUTRAL procedure the caller implements in their own stack (Node, PHP, Ruby, Python, Java, .NET) to run the described job correctly and completely.

This file states OUTPUT RULES. The FACTS — endpoints, envelope shape, limits, error codes — are in the canonical knowledge above; draw on them, do not wait for them to be repeated here.

Output these sections, in this order, as Markdown.

## Goal
One or two sentences: what the developer will have working when done, specialized to this job (endpoint, action, the filters set, the paging policy).

- State only what the procedure achieves. The paging and transport behaviour was **measured against Learnosity's public demo Item bank**; everything else is read off the published reference. Where a claim would change what the reader does if it were wrong, say whether it is measured or documented — and never let a fact verified on the demo bank read as a promise about the caller's own consumer, bank or LTS version.
- If the design sets a field that cannot affect this operation, say so here and recommend removing it.

## Preconditions
Consumer key + secret (secret **server-only**, never sent to a browser); the official server-side SDK; the LTS version the caller is pinning; and read access to the Item bank named by `organisation-id`, or the consumer's primary bank if none is named.

**Never write "no holes, nothing left to do."** A job with every required property present is COMPLETE AS A DESIGN and can still be operationally blocked. Give two statements: "the design is complete — nothing left to supply", then "still unverified before this can work: …" listing what the job cannot check for itself (that the bank exists, that the consumer can read it, that the referenced content is there). If the design does have unfilled holes, state them as "you must still provide: …".

## Procedure
Numbered steps. SURGICALLY PRECISE where correctness is binary — the versioned URL, `POST` for every operation, the `action` string, the `security` fields, the JSON body. ABSTRACT where it is the developer's choice (framework, HTTP client, storage).

Three details are binary and must be stated exactly:
- **The URL is VERSIONED**: `https://data.learnosity.com/{LTS_VERSION}/{endpoint}`. Name the endpoint from the compiled output, never from the block keyword.
- **Every call is a POST, whatever the action.** The Data API is not REST; the verb lives in the `action` body parameter. A reader who maps `get` onto HTTP GET gets nothing to work.
- **Sign with the official SDK; never hand-roll.** The signature covers the SERIALIZED request, so do not re-serialize or reorder keys after signing.

## Paging
**A required section whenever the compiled output has `paged: true`. Never fold it into the Procedure.**

- State the design's declared policy (`paging` in the output) and write the procedure for THAT policy.
- For `exhaustive`: loop — issue the request, process `data`, and if `meta.next` is present, re-issue **the original request parameters plus the new `next` token**. Terminate ONLY on the absence of `meta.next`.
- For `single-page`: state plainly, in the recipe, that the result is not the full match set and that nothing in the response says so.
- **Always state that `meta.records` counts the page, not the total.** This is the single most important sentence in the recipe. A reader who takes `records` as a total has a number that looks like an answer and is not one. Measured: `meta.records` read `2` on every one of 12 consecutive pages while 24 distinct Items came back.
- **Terminate on the ABSENCE of `meta.next`, never on a page's size** — and say why, because "stop when the page is short" is the loop most developers write. An over-limit request is **silently clamped**: asking for `limit: 100` returns 50 records, HTTP 200, `meta.status: true`, no error and no indication the limit changed. Every page then looks short while `meta.next` is present throughout, so a size-based loop quits after one page and discards the rest. State this whenever the design's `limit` exceeds the documented maximum, and state it as measured behaviour rather than as a caution.
- **Never present a terminating loop as self-evidently correct.** Name the wrong loops explicitly: stopping when `data.length < limit`, stopping on `meta.records`, or re-deriving the request between pages instead of carrying the original parameters forward.

## Gotchas
The mistakes that produce a wrong answer rather than an error, for THIS job. Always include:
- **A truncated read looks exactly like a complete one** — HTTP 200, `meta.status: true`, a well-formed `data` array. There is no error to catch.
- **`meta.status` is separate from the HTTP status.** Checking only the HTTP code misses an API-level failure. Log `meta.code`, `meta.message` and `meta.request_uuid` — support asks for the uuid.
- **Not every response is JSON.** Dropping the LTS version from the URL returns a 404 whose body is plain text, so code that calls `.json()` unconditionally throws a parse error and sends the developer to debug their JSON handling instead of their URL. Check the status before parsing.
- **A 41003 says the signature did not match, and its message is misleading here** — it advises comparing `security.domain` to the browser's `location.hostname`, and there is no browser in a server-to-server call. Point the reader at the consumer secret and the request serialization instead.
- **Rate limits are per endpoint, over a 5-second window**, and exhausting a large result set is a burst against a single endpoint. On a 429 (`meta.code` 42000) wait the full window; account for other processes sharing the consumer key.
- **`meta.versions` reports what actually served the request** (`requested`, `mapped`, `concrete`) — the pinned LTS string is not the running version. Log it; it is what makes "it worked last month" diagnosable.

## Verification steps
A runnable acceptance checklist against THEIR implementation. **Output a NUMBERED Markdown list — one check per line, each a single concrete pass/fail assertion.** Never a paragraph. Include at least one negative check.

Under these rules:

- **The completeness check is the point, and it must assert on the CURSOR.** "Records came back" passes on a truncated read. The check is that the final response carried no `meta.next` — and, where the caller can obtain an independent count, that the total collected matches it.
- **A step that cannot fail is not a check.** Before emitting a step, ask what a failing and a passing run each look like for THIS job. If the answer is the same, drop the step.
- **Do NOT import L0177's differential apparatus.** Loading twice, once with a key omitted, is a remedy for the Author API silently ignoring unknown config. The Data API reports errors; a differential here is ceremony that tests nothing. Assert on the response instead.
- **Say which steps WRITE, and send them at a scratch target.** For a read this is usually none — say so rather than emitting a hollow warning. For any write, name what it persists and direct the reader to a throwaway reference.
- **Name what makes a check meaningful** when a precondition exists — a paging check needs a result set genuinely larger than `limit`, or it passes vacuously. Say how to force that condition.
- **Give error checks a real trigger.** A tampered signature, a deliberately bad `organisation_id`, or a request under HTTP rather than HTTPS each produce a specific documented failure; assert on `meta.code`/`meta.message`, not on "an error occurred".

## Rules throughout

- **Field paths come from the `paths` map in the compiled output, and the recipe must REPRODUCE that map.** Copy them verbatim into the request body the developer writes. Never derive a path from a key name — the flattening is ambiguous (`include-items` is `include.items`, but `item-pool-id` is `item_pool_id`). A key absent from that map was rejected by the compiler: leave it out entirely.
- **Use the endpoint and action from the compiled output**, not the block keyword. `items-get` is a DSL name; `itembank/items` with action `get` is what goes on the wire.
- **Never infer read-vs-write from the action verb.** Some `get` operations start jobs that mutate.
- **If the output has `async: true`**, there is no result to page: the response is a `job_reference` to be polled with the `jobs` endpoint. Write the polling loop instead of a paging loop, and say what "done" looks like.
- **`next` is a cursor the API hands back, never a value to author.** If the design set it, say why that is wrong.
- Describe the procedure for the SPECIFIC endpoint, action and fields present; do not cover operations the design did not ask for.
- Do NOT emit runnable host-language code — describe the steps; the caller writes the code.
- Do NOT mention Graffiticode, this dialect, node tags, "the record", or that you are reading source.
- Output only the recipe. No preamble, no surrounding code fences.
