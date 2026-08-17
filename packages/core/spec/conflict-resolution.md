<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# L0178 conflict register — where the sources disagree, and what was done about it

An oracle's value is not that it holds facts; it is that it knows which facts to trust. This
file records every place the sources contradicted each other or contradicted the API's actual
behaviour, what the resolution was, and — where nothing resolved it — that it is still open.

Two rules govern this file. **An unresolved conflict stays unresolved in writing.** Picking the
tidier answer and moving on is how a cookbook acquires a confident wrong fact, which is the one
failure this dialect cannot afford. And **a resolution records what settled it**, so a later
reader can overturn it with better evidence instead of re-litigating it from scratch.

## How conflicts get resolved, in precedence order

1. **Live measurement beats documentation.** Scoped to what was actually exercised — see the
   caveat at the end.
2. **A normative field beats prose.** `Action type`, `Endpoint`, and the `Request body
   parameters` tables are specifications; section headings and introductory paragraphs are
   descriptions, and they drift.
3. **Two articles that disagree are usually both right about different cases.** Look for a
   discriminator before declaring a conflict — one was found, and it changed the language design.
4. **Otherwise, mark it OPEN** and say what the recipe should do in the meantime.

## Register

| # | Conflict | Status |
| :-: | :--- | :--- |
| C1 | Which actions exist | RESOLVED — prose incomplete |
| C2 | `duplicate`: action or path? | RESOLVED — normative field |
| C3 | `sessions` + `set` documented twice | RESOLVED — both right, discriminated |
| C4 | Which operations are asynchronous | RESOLVED — reframed |
| C5 | HTTP-not-HTTPS response code | **OPEN** |
| C6 | `limit` above the maximum | RESOLVED — measured |
| C7 | Response envelope shape | RESOLVED — docs incomplete |
| C8 | What `meta.records` counts | RESOLVED — measured |
| C9 | 41003's message contradicts its own API | RESOLVED — interpreted |
| C10 | `domain` means different things per API | RESOLVED — not carried across |
| C11 | Bare host vs versioned URL | RESOLVED — genuinely opposite |
| C12 | Whether verification must be differential | RESOLVED — L0177 only |
| C13 | Request body encoding | RESOLVED — assumption was wrong |
| C14 | The "short page" hazard | RESOLVED — re-grounded |
| C15 | When `meta.next` is returned | RESOLVED — measured, docs half-right |
| C16 | `jobs` + `get` `status` default | RESOLVED — measured, docs WRONG |
| C17 | Shape of the async `data` envelope | PARTLY OPEN — one side measured |
| C18 | Whether `set` merges or replaces | RESOLVED — measured; docs silent |

---

### C1 — Which actions exist · RESOLVED

*Getting Started With the Data API* (`360000758637`) says the action "can be either `"get"`,
`"set"` or `"update"`". *Session-deletion* (`Endpoints`) documents a fourth: `delete`.

**Resolution.** Four actions — `get`, `set`, `update`, `delete`. The Getting Started article is
introductory prose enumerating the common cases, not a specification of the action set. The
endpoint articles' `Action type` fields are, and across all 57 blocks they yield exactly four.

**Depends on it:** `vocab.ts` treats the action vocabulary as closed at four verbs.

### C2 — `duplicate`: action or path? · RESOLVED

*Items - Endpoints* opens "Endpoints: Get Items **Set Items Duplicate Items**", which reads as
three operations and invites a `duplicate` action. Its own normative block says
`Endpoint /{LTS_VERSION}/itembank/items/duplicate … Action type "set"`.

**Resolution.** `duplicate` is a **path**, taking action `set`. Precedence rule 2: the
`Action type` field is normative, the heading is a description of the article's contents.

**Why it mattered:** an invented fifth action would have widened the registry's second axis
across every block to serve a case that does not exist. Recorded in `coverage.md`.

### C3 — `sessions` + `set` documented twice · RESOLVED

*Template-submission* (`26076278679069`) and *Failed-submissions* (`26076336091933`) both
document `POST /sessions` with `Action type "set"`, with **different request fields**. On its
face this breaks the `(endpoint, action)` registry key.

**Resolution.** Not a contradiction — a **discriminated union on `data_format`**, and each
article documents one arm:

| `data_format` | `data` | Also takes |
| :-- | :-- | :-- |
| `failed_submission` | `array[string]` of base64 session blobs | `ignore_response_revisions` |
| `from_template` | `array[object]` of sessions and responses | — |

Precedence rule 3 applied: the discriminator was found by reading both arms side by side rather
than by declaring the key insufficient.

**Depends on it:** the registry key stayed two-level. A third axis would have been carried by
every block to serve one case.

### C4 — Which operations are asynchronous · RESOLVED

*Jobs - Endpoints* describes the `jobs` family as "Create long running Learnosity jobs", which
reads as async being a property of the `jobs/*` paths. But 13 blocks across `itembank/*`,
`sessions/*`, `reports/*` **and** `jobs/*` return `{ data: { job_reference } }`.

**Resolution.** Async is a property of the **individual operation**, not of a path prefix.
`jobs` + `get` is the shared **polling channel** that async operations from anywhere are
redeemed against.

**Why it mattered:** the first reading — async as a second program shape needing its own head —
came from looking only at the `jobs/` paths. It was wrong, and it would have produced a head
that could not model `itembank/pools` + `set`.

### C5 — HTTP-not-HTTPS response code · **OPEN**

*403 - Troubleshooting* says 403 is returned for "attempting to access endpoints over HTTP
instead of HTTPS". Posting to `http://data.learnosity.com/v2025.2.LTS/itembank/items` returned
**HTTP 400** with `meta.code` **41000** "Missing security parameters".

**Not resolved.** The most likely explanation is that the redirect to HTTPS dropped the POST
body, so the observation may say more about the client's redirect handling than about any
scheme policy in the API. That is a hypothesis, and testing it needs a client that will not
follow redirects.

**What the prompts do meanwhile:** neither code is presented as the signature of a scheme
mistake. `instructions.md` marks the claim UNRESOLVED and carries both observations;
`spec-directive.md` no longer tells the recipe that a 403 implies HTTP-instead-of-HTTPS.

**To close it:** re-run with redirects disabled, and separately with a client that re-sends the
body on redirect. If the 400 is a redirect artefact, the documented 403 stands.

### C6 — `limit` above the maximum · RESOLVED (measured)

*Items - Endpoints* states `limit … Maximum: 50` and says nothing about exceeding it. The
natural reading of a documented maximum is that breaching it is an error.

**Resolution.** It is **silently clamped**. `limit: 100` returns HTTP 200, `meta.status: true`,
`meta.records: 50`, 50 records — no error, no warning, and nothing in the response indicating
the limit changed.

**Why it mattered most:** the clamp composes into data loss. Every page then looks short (50
against a requested 100) while `meta.next` is present throughout, so a loop written as "stop
when `data.length < limit`" quits after one page. The compiler's warning was rewritten from
"exceeds the documented maximum" — which reads as *the request will be rejected*, the opposite
of what happens — to name the clamp and its consequence.

### C7 — Response envelope shape · RESOLVED (docs incomplete)

Documented examples show `meta` as `{status, timestamp, next?, records}`. Live responses also
carry **`meta.versions`** `{requested, mapped, concrete}` on success, and **`meta.request_uuid`**
on failure.

**Resolution.** Not a contradiction, an omission — the docs' examples are abridged. Both fields
are documented in `instructions.md` as `[verified]`. `meta.versions` is worth logging because the
pinned LTS string is not the version that served the request (`v2025.2.LTS` → concrete
`v1.79.5`); `request_uuid` is what Learnosity support asks for.

### C8 — What `meta.records` counts · RESOLVED (measured)

The reference never states the scope of `meta.records`, and the name reads as a total.

**Resolution.** It counts the **current page**. Measured over 12 consecutive pages at `limit: 2`:
`meta.records` was `2` on every page while 24 distinct Items came back.

**Depends on it:** this is the failure the whole dialect is built around, and why `paging` is a
hole rather than an advisory.

### C9 — 41003's message contradicts its own API · RESOLVED (interpreted)

A bad secret returns HTTP 403 with `meta.code` 41003 and the message "Please check if
`security.domain` is the same as `location.hostname` **of the browser**". There is no browser in
a server-to-server Data API call.

**Resolution.** The **code** is meaningful ("the signature did not match"); the **message** is
front-end boilerplate shared with the client-side APIs and is misleading here. The prompts tell
the reader to read 41003 as a signature mismatch and to check the consumer secret and the request
serialization — never a browser hostname.

**Note:** 41003 is the same code L0177 documents for the Author API, where the browser advice is
apt. The code is shared; its explanation is not portable.

### C10 — `domain` means different things per API · RESOLVED

L0177 records `domain` as the host **serving the editor**, which the signature binds to, and a
mismatch as the #1 cause of a failed init. In the Data API, `security.domain` is the domain of the
calling app, and Learnosity's own examples use `localhost`.

**Resolution.** Same field name, different meaning. L0177's domain-match rule is **not carried
across**, and `instructions.md` says so explicitly so a reader who knows the Author API does not
import it. An earlier draft of this repo overcorrected and said `domain` has no analogue here;
that was also wrong, and was softened — it means something different, not nothing.

### C11 — Bare host vs versioned URL · RESOLVED

L0177 requires the Author API to load from the **bare host**; a versioned path 404s. The Data API
requires the **versioned path**; dropping the version 404s.

**Resolution.** Genuinely opposite, and both verified in their own dialect. The two give
contradicting advice for what looks like the same mistake, so `instructions.md` states the
contrast explicitly rather than leaving a reader to generalise from one API to the other.

**Additional finding:** the Data API's unversioned 404 returns a **plain-text** body, not JSON, so
code that calls `.json()` unconditionally throws a parse error and sends the developer to debug
their JSON handling instead of their URL.

### C12 — Whether verification must be differential · RESOLVED

L0177 requires every check on config-driven behaviour to be **differential** — a control run with
the key omitted — because the Author API fails open on `config`. The obvious move when starting a
sibling dialect is to inherit that discipline.

**Resolution.** It does **not** transfer. The Data API reports errors in the response envelope; it
does not silently ignore unrecognised input. A differential here tests nothing and manufactures
ceremony. `spec-directive.md` refuses it by name, `instructions.md` gives the reason, and
`spec-directive.test.ts` pins both so the refusal cannot be quietly dropped.

**This is the clearest case for keeping a register at all:** the conflict is between two of our
own dialects, and the wrong resolution would have looked like consistency.

### C13 — Request body encoding · RESOLVED (assumption was wrong)

An early design note in this project described the Data API request as form-encoded
(`security` / `request` / `action` as form fields). The reference states `Body content type:
application/json`.

**Resolution.** JSON. The assumption was never in a shipped file, but it is recorded here because
it was load-bearing in the design conversation before the sources were read, and because "the
recipe was built on an unchecked prior" is exactly what this register exists to surface.

### C14 — The "short page" hazard · RESOLVED (re-grounded)

`spec-directive.md` warned against "stopping on a short page" as a paging hazard. That was
asserted from reasoning, not evidence.

**Resolution.** The hazard is real but the original grounding was not. Ten consecutive pages under
a status filter never produced a short page with more data behind it, so the mechanism as
originally stated remains unobserved. The rule survives because **C6 produces the identical
failure by a measured route** — the clamp makes every page look short. The unevidenced wording was
removed and the rule now rests on the clamp.

### C15 — When `meta.next` is returned · RESOLVED (measured; the docs are half-right)

The `itembank/items` reference describes `meta.next` as the token to fetch "the next page",
implying it appears when more data exists — and measurement confirmed that for `itembank/*`:
absence is exactly exhaustion. Read alone, that generalises to a universal paging loop.

The `sessions/responses` article says something different, and says it only there: the token is
returned "regardless of whether additional records exist beyond the current page", and notes this
"differs from other Data API endpoints such as those under the Item bank". Same field, same
envelope, opposite meaning.

**Resolution.** Both are right about their own family, and the difference is real:

| Family | `meta.next` | End-of-data signal |
| :-- | :-- | :-- |
| `itembank/*` | omitted at exhaustion | its **absence** |
| `sessions/*` | always present | an **empty page** |

Measured on `sessions/responses`: one `session_id` at `limit: 10` — a result set of exactly one,
nothing beyond it — returned that record WITH a token. Following the token returned **zero records
and the same token again**. It is a long-poll resumption cursor, kept so a caller can re-poll for
sessions created later.

**And the sessions article is itself wrong in one clause.** It says the token comes back "only
when the current result set contains results". The empty page carried one. So the token is not
merely more-permissive on this family — it is unconditional.

**Why it mattered.** The dialect had shipped "terminate ONLY on the absence of `meta.next`" as a
universal rule, drawn from the one family it had modelled. On `sessions/*` that loop **never
terminates**. The inverse is just as bad: "stop when the page is short" is the only correct rule
on `sessions/*` and a data-loss bug on `itembank/*` (see C6). Neither can be stated generally.

**Depends on it:** `Block.pagingEnd` in `vocab.ts`, `paging_end` in the compiled output, and the
per-endpoint branch in `spec-directive.md`'s Paging section. This is why the second block modelled
was deliberately drawn from a different endpoint family.

### C16 — `jobs` + `get` `status` default · RESOLVED (measured; the reference is wrong)

The reference documents `status` on `jobs` + `get` as `Default: ["completed"]`. Taken at face
value that makes polling hostile: a freshly submitted job is `queued`, so a poll that omits
`status` would return nothing until the job finished.

**Resolution — the documented default does not exist.** Measured against a private consumer on
sandbox 386: a list request with no `status` returned jobs with statuses `["queued","completed"]`,
identical to the same request passing all four values explicitly.

**And the error inverts.** Because the default is not applied, omitting `status` polls correctly.
It is the developer who FOLLOWS the reference — writing `status: ["completed"]` because that is
documented as the default — who gets **zero records for an in-flight job**, indistinguishable
from "no such job". Measured directly: same job, same instant, `status` omitted returned 1 record
(`queued`), `status: ["completed"]` returned 0.

**Why it mattered.** This was written into the plan as a predicted trap in the opposite direction
— that omitting `status` would silently filter. Building the block the wrong way round would have
produced a recipe that instructs the reader to do the one thing that breaks the loop. It is the
clearest case yet for measuring a documented default rather than restating it.

**Depends on it:** the Polling section of `spec-directive.md`, which tells the recipe to OMIT
`status` and says why a careful developer will get this wrong.

### C17 — Shape of the async `data` envelope · PARTLY OPEN

Two endpoints document the async response differently. `itembank/offlinepackage` shows
`"data": [ { "job_reference": … } ]` — an **array**. `sessions` + `set` (both variants) shows
`"data": { "job_reference": … }` — an **object**.

**Measured, one side only.** `itembank/offlinepackage` really does return an array:
`data[0].job_reference` holds the reference and `data.job_reference` is `undefined`.

**Still open:** whether `sessions` + `set` truly returns the object form. Confirming it requires
POSTing session data, which is a write — barred on the public demo account by policy, and not yet
worth doing on the sandbox. So the inconsistency is documented on one side and verified on the
other, which is not the same as confirmed.

**What the prompts do meanwhile:** the Polling rule states the array form as measured for this
endpoint and tells the recipe not to generalise a single envelope shape across endpoints.

**To close it:** fire one `sessions` + `set` at sandbox 386 with a throwaway payload and read the
envelope.

### C18 — Whether `set` merges or replaces · RESOLVED (measured; the reference never says)

The `itembank/items` + `set` reference lists the Item properties and marks several optional. It
does not say what happens to a property that is left out of the payload. The natural reading of
"optional" is *omit it and it stays as it was* — which is how nearly every partial-update API a
developer has met behaves.

**Resolution — `set` REPLACES.** Measured on sandbox 386: an Item created with `description` and
`note`, then written again with only `reference`, `title` and `definition`, came back with
`description: ""` and `note: null`. Omitted fields are cleared. `meta.status` was `true` both
times; nothing in either response mentions it.

**Why it is the worst of the write hazards.** The read-modify-write loop is the obvious way to
change one field, and here it silently destroys every field not resent. The response cannot warn
you either — a successful `set` returns `data: []`, so there is nothing to compare against.

**Depends on it:** the Write safety section of `spec-directive.md`, which leads with replace
semantics, and the compiler's write advisories.

**Related, and not a conflict:** `status` defaulting to `unpublished` IS documented, as is the
requirement that an Item be published to be delivered. It is recorded as a trap rather than a
contradiction — the two facts are simply far apart in the reference, and their combination is
what bites.

---

## Caveat on "measured"

Measurements come from two consumers, and each entry says which. C1–C15 were taken against
**Learnosity's public demo Item bank** on 2026-08-13; C16–C18 against a **private consumer on
sandbox Item bank 386** on 2026-08-17. Both used `learnosity-sdk-nodejs` 0.7.0 against
`v2025.2.LTS` (concrete `v1.79.5`).

Writes are never sent to the public demo account — it is shared, and writes persist. That policy
is why C17 stays half-open rather than being closed with a quick POST. A measured fact
says the mechanism behaves that way on that bank at that version. It does not say the reader's
consumer, bank or pinned version does, and no resolution above should be quoted to a caller as a
guarantee about their own deployment.

Unverified surface remains large: 56 of 57 blocks are unbuilt, and every write operation, the
async job family, and the rate limits are documented only. Expect this register to grow — and
prefer growing it to quietly resolving a conflict in favour of whichever source was read last.
