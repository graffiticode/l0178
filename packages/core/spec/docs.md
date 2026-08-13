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

**Early.** One operation is modelled: `itembank/items` with action `get`, the Item
bank read. The other 56 documented operations are listed in `coverage.md` and are
unbuilt, not unsupported. No Data API fact in this package has been verified
against a live consumer — everything is read off Learnosity's published reference.

### Overview

The code

```
data-job
  paging EXHAUSTIVE
  items-get [ status ["published"] organisation-id 123 limit 50 {} ]
  {}..
```

describes a job that reads every published Item from bank 123, following the
`meta.next` cursor until the result set is exhausted.

`paging` is required on a paged operation. Without it the design is incomplete —
a truncated read returns HTTP 200 with a well-formed but short result set, and
`meta.records` counts the page rather than the total, so nothing downstream can
catch it.

### Vocabulary

| Function | Arity | Example | Description |
| :------- | :---: | :------ | :---------- |
| **data-job** | 1 | `data-job … {}..` | The head; carries the policy and the block |
| **items-get** | 2 | `items-get [ … ]` | `itembank/items` + action `get` |
| **paging** | 2 | `paging EXHAUSTIVE` | `EXHAUSTIVE` or `SINGLE-PAGE`; design intent only |

See `spec.md` for the full request-field table, and `coverage.md` for the whole
Data API surface this is one operation of.
