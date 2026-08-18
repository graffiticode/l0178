<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# L0178 User Manual

**Introduction**

*Graffiticode* is a collection of domain languages used for creating task
specific web apps. **L0178** is a *Graffiticode* language that produces developer
cookbook recipes for the **Learnosity Data API** — the server-to-server interface
to a Learnosity item bank.

L0178 is documentation-only. It never calls the Data API: the caller's own code
signs and sends every request with the caller's own consumer key. What L0178
supplies is the published documentation plus the un-written tricks and tips.

### Status

**Early.** Eighteen of the Data API's 57 operations are modelled, spanning every structural
shape the API has: paged and unpaged reads, synchronous and asynchronous work, writes that
replace and writes that merge, a destructive delete, and an endpoint whose two operations are
told apart by a field value.

Coverage is uneven on purpose, and `coverage.md` says which is which. The `itembank/*` and
`jobs` operations have been exercised against a live consumer. The session submissions, the
delete, and six of the eight updates are modelled from documentation only — the delete
deliberately, since running it destroys a session irreversibly.

### Vocabulary

A program is one `data-job` head carrying a paging policy and exactly one block, terminated
with `{}` then `..`.

| Function | Arity | Example | Description |
| :------- | :---: | :------ | :---------- |
| **data-job** | 1 | `data-job … {}..` | The head; carries the policy and the block |
| **a block** | 2 | `items-get [ … ]` | Selects the operation — see `spec.md` for the index |
| **paging** | 2 | `paging EXHAUSTIVE` | `EXHAUSTIVE` or `SINGLE-PAGE`; design intent only |

`spec.md` lists every block; `instructions.md` gives each one's request fields. They are not
repeated here, because a third copy would be a third thing to keep in step.
