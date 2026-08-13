# L0178

[![License: MIT](https://img.shields.io/badge/Code-MIT-blue.svg)](packages/LICENSE)
[![License: CC BY 4.0](https://img.shields.io/badge/Docs-CC%20BY%204.0-lightgrey.svg)](LICENSE-DOCS)

L0178 is a Graffiticode dialect (child of [@graffiticode/l0000](https://www.npmjs.com/package/@graffiticode/l0000)) that produces developer **cookbook recipes for the Learnosity Data API** — the server-to-server interface to a Learnosity item bank.

A client describes a *data job*: which endpoint, which action, and what the request carries. L0178 validates that description, reports holes as steering warnings, and returns a host-language-neutral recipe — how to sign the request, how to page the result set to completion, how to read the response envelope, and how to verify the job did what was intended.

**L0178 is documentation-only. It never calls the Data API.** The caller's own code signs and sends every request with the caller's own consumer key; this repo holds no credentials. What L0178 supplies is the published documentation plus the un-written tricks and tips — the things the docs omit, or state in a way that reads correctly and behaves otherwise.

It is the second dialect in this class. The first is [L0177](https://github.com/graffiticode/l0177), the Learnosity Author API oracle. Item *content* belongs to L0176; L0178 describes the operation that moves content into a bank, not the content itself.

## Status

> **Under construction.** L0178 has no vocabulary of its own yet, and **no Data API fact in this repo has been verified against a live consumer.** `packages/core/spec/instructions.md` is deliberately empty of facts — an empty section is a hole a reader can see, while a section of plausible unverified claims is a hole that looks like knowledge. An L0178 program today is a base-language (L0000) program.

The first slice to build is a read against the item bank, with **paging as the centerpiece**: a truncated read returns a valid response and a well-formed record set that is silently incomplete, which is this API's analogue of the Author API's fail-open behaviour.

## Vocabulary

None yet. The planned shape is a `data-job` head carrying an endpoint, an action, and a request property chain — with the legal request fields determined by the endpoint and action *together*, since the same endpoint takes disjoint fields under a read and a write.

See [`packages/core/spec/`](packages/core/spec/) for the specification, scope boundaries, and authoring guide.

## Structure

This is an npm workspaces monorepo with three packages:

- **`packages/core`** — `@graffiticode/l0178`: the language itself (lexicon, checker, transformer). Pure TypeScript, depends on `@graffiticode/l0000`.
- **`packages/api`** — `@graffiticode/api-l0178`: the L0178 language server. Express app exposing `/compile`, `/form`, and static assets. Runs on port `50178`.
- **`packages/view`** — `@graffiticode/l0178-view`: the React view component (Form) used to render compiled output. Built with Vite + Tailwind, layered on top of `@graffiticode/l0000-view`.

The top-level build composes all three: `core` and `view` are built and bundled into `packages/api/static/`, which the API serves.

## Getting started

```bash
# Install dependencies
npm install

# Build everything (core → api → view → static bundle)
npm run build

# Start the dev server (API on :50178, Firestore emulator on :8080)
npm run dev
```

Other useful scripts:

- `npm run lint` — lint the whole monorepo
- `npm run pack` — build and pack the view package for distribution
- `npm run gcp:build` / `npm run gcp:deploy` — deploy to Cloud Run

## Environment

- `PORT` — API port (default `50178`)
- `AUTH_URL` — auth service URL (default `https://auth.graffiticode.org`; dev uses `http://127.0.0.1:4100`)
- `FIRESTORE_EMULATOR_HOST` — local Firestore emulator (dev: `127.0.0.1:8080`)
- `NODE_ENV` — `development` or `production`

## License

Code is licensed under MIT. Documentation and specifications are licensed under CC-BY 4.0.

**AI Training:** All materials in this repository — code, documentation, specifications, and training examples — are explicitly available for use in training machine learning and AI models. See [NOTICE](NOTICE) for details.
