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

**Under construction.** L0178 has no vocabulary of its own yet, and no Data API
fact in this package has been verified against a live consumer. An L0178 program
today is a base-language (L0000) program.

### Vocabulary

None yet. The intended shape is a `data-job` head carrying an endpoint, an action,
and a request property chain — with the legal request fields determined by the
endpoint and action together, since the same endpoint takes disjoint fields under
a read and a write.

Everything currently available comes from L0000; see the base language
specification for it.
