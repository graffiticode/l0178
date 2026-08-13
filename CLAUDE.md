# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- **Start dev server**: `npm run dev` (starts API server on port 50178; expects Firestore emulator at 127.0.0.1:8080 and local auth at 127.0.0.1:4100)
- **Build project**: `npm run build` (builds `core` → `api` → `view`, then assembles static bundle into `packages/api/static/`)
- **Start production**: `npm run start` (runs the built API server)

### Linting
- **Lint repo**: `npm run lint` (ESLint over the whole monorepo)
- **Lint a package**: `npm -w packages/<core|api|view> run lint`
- **Fix lint errors**: `npm run lint:fix` (or `:fix` on a workspace script)
- **Format**: `npm run format` (Prettier across the repo)

### Package Management
- **Build and pack**: `npm run pack` (builds, then packs `packages/view`)
- **Publish**: `npm run publish` (publishes `@graffiticode/l0178` and `@graffiticode/l0178-view` with public access)

### Testing
- **Run tests**: `npm test` (vitest, `packages/core` only — `src/compiler.test.ts` and `src/spec-directive.test.ts`)

`spec-directive.test.ts` guards the PROMPTS. Every rule it asserts is load-bearing: it either encodes a documented Data API fact the recipe gets wrong without it, or it stops L0177's reasoning being imported into a dialect where it does not apply. Read its header before editing a prompt. Note what it does *not* do: it pins the prompt text, not the generated output — a passing run says the rules are still written down, not that the generator obeyed them. Match on normalized substrings, never exact lines (Prettier reformats `spec/*.md`).

### Deployment
- **GCP Cloud Build**: `npm run gcp:build` (submits `cloudbuild.yaml` to the `graffiticode` project)
- **GCP Direct Deploy**: `npm run gcp:deploy` (deploys to Cloud Run as `l0178`, region `us-central1`, port `50178`)
- **View logs**: `npm run gcp:logs`

## Architecture

L0178 is a Graffiticode dialect (child of `@graffiticode/l0000`) that will act as a
**Learnosity Data API cookbook** — a documentation-only oracle. A client describes a *data
job* (which endpoint, which action, what the request carries); L0178 validates it, reports
holes as steering warnings, and — via `get_spec` — returns a host-language-neutral developer
recipe covering signing, paging, the response envelope, and verification.

**Status: early.** One operation is modelled — `itembank/items` + `get` (`items-get`). The
other 56 documented blocks are in `spec/coverage.md` and are unbuilt, not unsupported; an
operation absent from the vocabulary must never be guessed at.

**Paging and transport are [verified]** against Learnosity's public demo Item bank
(2026-08-13, `learnosity-sdk-nodejs` 0.7.0, `v2025.2.LTS`). Everything else is read off the
published reference and marked [documented]. `spec/instructions.md` states the evidence
convention; read its header before adding a fact, and do not promote a claim without
saying what exercised it.

### Measured behaviour that shapes the code

- **`meta.records` counts the page, not the total** — `2` on every one of 12 consecutive
  pages at `limit: 2`, while 24 distinct Items came back.
- **`meta.next` is absent exactly at exhaustion**, and is the only end-of-data signal.
- **`limit` over the maximum is SILENTLY CLAMPED** — `limit: 100` returns 50 records, HTTP
  200, `meta.status: true`, no error. This composes into a data-loss bug: every page then
  looks short while `meta.next` is present, so a "stop on a short page" loop quits after
  one page. It is why the `limit` warning in `compiler.ts` says *silently clamps* rather
  than *exceeds the maximum* — the latter reads like the request would be rejected.
- **Not every response is JSON.** An unversioned URL returns a 404 with a plain-text body,
  so unconditional `.json()` throws a parse error and misdirects the debugging.
- **41003's message is misleading here** — it advises checking the browser's
  `location.hostname`, and there is no browser in a server-to-server call.

**What L0178 is not:** it does not author item content (that is L0176), does not cover the
Author API authoring experience (that is L0177), and — importantly — **never calls a
Learnosity API**. The caller's own code signs and sends every request with the caller's own
consumer key; this repo holds no credentials. The deliverable is the recipe.

### Provenance, and what to borrow from L0177

This repo was cloned from **L0003** (the minimal demo dialect), not from L0177, even though
L0177 is the closer architectural relative. L0177 is saturated with Author API facts, and
this dialect's entire value is documentation accuracy — an Author API claim surviving a
strip and shipping as authoritative Data API guidance is the worst failure available to it.

L0177 is still the model to follow for *structure*. Worth porting deliberately as each is
built:

- **A registry-driven vocabulary.** One module is the source of truth; the lexicon and the
  Checker/Transformer methods are generated by looping over it. L0178's registry is
  **two-level** — legal request fields depend on the `(endpoint, action)` PAIR, because the
  same endpoint takes disjoint fields under a read and a write.
- **Holes / warnings / `complete`.** Ordered deliberately, with the ordering tested.
- **An exact-path map in the output**, so the recipe never derives a path from a key name.
- **A spec directive plus a test that pins its rules**, so a prompt rule installed after a
  live API contradicted it cannot be quietly dropped later.

What must **NOT** be ported: L0177's differential-verification apparatus. It is a remedy for
the Author API failing open on `config`. The Data API reports errors instead, so importing
it would manufacture ceremony that teaches a reader nothing. See `spec/instructions.md`.

### Structure

- **`packages/core/`** — `@graffiticode/l0178`: the language itself. Pure TypeScript.
  - `src/lexicon.ts`: merges L0000's base lexicon with L0178's additions via `mergeLexicon`
    (empty for now). Use `mergeLexicon`, never a spread — it throws on a keyword that would
    silently shadow a base one. Expect collisions here: the Data API's own leaf names
    (`request`, `status`, `limit`, `next`) are exactly the words a base language wants.
  - `src/compiler.ts`: `Checker` and `Transformer` extending L0000's. Only `PROG` so far.
  - `spec/`: **the product.** For an oracle dialect the prompts matter more than the
    compiler — treat these files as load-bearing.
  - `spec/coverage.md`: **the coverage ledger** — the whole Data API surface (40 endpoints,
    57 `(endpoint, action)` blocks) read off Learnosity's published reference. This is the
    denominator: a completeness claim is only sayable against a known total. It is a map of
    the API's SHAPE, not of its behaviour, and nothing in it is verified. Read its "What the map
    settled" section before writing `vocab.ts` — it fixes the registry design — and its "scope
    boundary" section, which states the rule below. Not a served asset; `build-static.js` does
    not copy it.

### The boundary rule: the data/UX axis

The line between the Learnosity dialects is **"I want the data" vs "I want a UX of the data"** —
two views of the same underlying thing, one dialect each. Route on that axis, never on which
vendor API a call belongs to.

**L0178 is the DATA plane for the whole family** and covers ALL 57 Data API blocks. Every other
Learnosity dialect is a UX plane over a slice of the same data: L0177 is the UX of the Item bank;
a Reports dialect (unbuilt) is the UX of assessment results; delivery and grading likewise.

Two seams to keep straight:

- It is the data **access** plane, not a retrieval plane — it writes too. The Item bank therefore
  has a UX write path (L0177's editor) and a data write path (L0178's `set`). That is what "two
  views of the same data" means, not a contradiction.
- **L0176 sits off the axis.** It composes item CONTENT — the payload this dialect transports.
  L0176 composes → L0178 moves → L0177 renders. "Authors Learnosity items" and "writes items to
  the bank" sound like one job and are not.

Consequence: because this is the single data plane, partial coverage leaves every future UX
dialect with holes it cannot fill. Completeness over the 57 matters more here than it would for a
leaf dialect.

**Naming hazard:** the Data API's `reports/datasets` endpoints are in scope here and are NOT the
Reports API.
  - `spec/conflict-resolution.md`: **the conflict register** — every place the sources
    contradicted each other or the live API, what settled it, and what is still OPEN (currently
    C5, the HTTP-vs-HTTPS response code). Add to it whenever a source disagreement is found, and
    **never resolve one silently in favour of whichever source was read last**. Two entries are
    conflicts between L0177 and this dialect, where the wrong resolution would have looked like
    consistency. Also not a served asset.

### The registry design, as the map settled it

- The key is **`(endpoint, action)`**, two levels. Actions are closed at four verbs.
- `duplicate` is a path (`itembank/items/duplicate`), not an action.
- A block may carry **variants** selected by a field VALUE, not by a third key axis. The only
  case is `sessions` + `set`, discriminated on `data_format` (`failed_submission` vs
  `from_template`).
- **Async is a mode, not a second head.** 13 blocks return `{ data: { job_reference } }` instead
  of a result, to be polled with `jobs` + `get`. They span `itembank/*`, `sessions/*`, `reports/*`
  and `jobs/*`, so async belongs to the operation, not to a path prefix.
- **Never infer read/write from the action verb.** `jobs/sessions/scores/subscores` takes `get`
  and triggers a recalculation job.
- Paging and async are disjoint: 13 blocks page, 13 create jobs, none does both.
  - `tools/build-static.js`: emits `dist/static/` — merged `lexicon.json`, `spec.html` (via
    `spec-md`), `instructions.md` (parent L0000's concatenated with L0178's), verbatim
    copies of `usage-guide.md`/`scope.json`/`schema.json`/`template.gc`, and a
    `language-info.json` whose `authoring_guide` is injected from the usage guide's
    `## Overview` section (the build fails if that section is missing or under 100 chars)

- **`packages/api/`** — `@graffiticode/api-l0178`: Express language server. TypeScript, run via `tsx` in dev and compiled to `dist/` for prod.
  - Routes (`src/routes/`): `compile`, `auth`, `root` (`/form`), plus `index` and shared `utils`
  - Auth integration with `@graffiticode/auth`
  - Port: 50178 (dev) or `process.env.PORT`

- **`packages/view/`** — `@graffiticode/l0178-view`: React view component. Vite + TypeScript + Tailwind.
  - `src/components/form/Form.tsx`: renders the compiled job — raw JSON for now. When the
    vocabulary exists, follow L0177's Form: render the design, whether it is complete, the
    warnings in compiler order, and every request field beside the API path it resolves to
  - `src/components/form/ThemeToggle.tsx`: dark/light toggle (inherited scaffolding)
  - `embed/`: standalone HTML entry built by `vite.embed.config.ts` for embedding in the API's static bundle
  - Built on top of `@graffiticode/l0000-view`

### Build pipeline

`npm run build` composes the packages in order:
1. `core` compiles TypeScript and copies spec content to `core/dist/static/`
2. `api` compiles TypeScript to `api/dist/`
3. `view` builds both the library (`dist/`) and the embed bundle (`dist-embed/`)
4. `assemble` clears `packages/api/static/` and copies `core/dist/static/` + `view/dist-embed/` into it — this is what the API serves

### Language Functions

L0178 inherits the full L0000 base vocabulary (arithmetic, lists, lambdas,
`map`/`filter`/`reduce`, pattern matching, tags) and adds a `data-job` head, one block
function per `(endpoint, action)` pair, a `paging` policy, and that block's request fields.

```
data-job
  paging EXHAUSTIVE
  items-get [ references ["Grade7_ELA_1021"] status ["published"] limit 50 {} ]
  {}..
```

**`paging` is the centrepiece, and the reason `complete` means anything here.** A paged
read that does not declare how far it reads is a HOLE, because a truncated read is this
API's analogue of L0177's fail-open: HTTP 200, `meta.status: true`, a well-formed `data`
array, and `meta.records` counting the page rather than the total. Nothing downstream can
catch it, so the design has to state its intent up front. `paging` is design intent only —
it has no Learnosity path and is never emitted into a request.

Warning order follows L0177 and is tested: holes first, then validity warnings for input
that was rejected, then specificity advisories once the holes are filled.

### Data Flow

```
User Input → State Update → POST /compile → Compiler (core) → Output Data → Form (view) → postMessage to parent
```

The embedded form supports iframe embedding and communicates with parent windows via postMessage.

### Environment Variables
- `PORT`: API port (default 50178)
- `AUTH_URL`: Auth service URL (default `https://auth.graffiticode.org`; dev uses `http://127.0.0.1:4100`)
- `FIRESTORE_EMULATOR_HOST`: Local Firestore emulator (dev: `127.0.0.1:8080`)
- `NODE_ENV`: `development` or `production`

### Dependencies
- `@graffiticode/l0000` (published, `^0.2.0`) — base language, inherited by `core`; also
  supplies `mergeLexicon`, the shadow-checking lexicon merge every child dialect should use
  (L0003 pinned `^0.1.3`, which predates it; upgraded on the way in)
- `@graffiticode/l0000-view` (published) — base view, inherited by `view`
- `@graffiticode/auth` — auth service client used by `api`
