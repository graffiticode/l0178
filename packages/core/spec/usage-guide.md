<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# L0178 Usage Guide

> **UNDER CONSTRUCTION.** The vocabulary described below does not exist yet, and no
> Data API fact in this package has been verified against a live consumer. L0178
> cannot answer a caller today. See `spec/scope.json`.

## Overview

L0178 is a developer cookbook for the **Learnosity Data API** — the server-to-server
interface to a Learnosity item bank. A client describes a *data job*: which endpoint,
which action, and what the request carries. L0178 validates that description, reports
missing or unsafe parts as steering warnings, and returns a host-language-neutral
recipe covering how to sign the request, how to page the result set to completion, how
to read the response envelope, and how to verify the job did what was intended.

It is documentation-only. It never calls the Data API: the caller's own code signs and
sends every request with the caller's own consumer key. What L0178 supplies is the
published documentation plus the un-written tricks and tips — the things the docs omit
or state in a way that reads correctly and behaves otherwise.

It does not author item content (that is L0176) and does not cover the Author API
authoring experience (that is L0177).

## Vocabulary Cues

Not written yet. The intended shape is a `data-job` head carrying an endpoint, an
action, and a request property chain — with the legal request fields determined by the
`(endpoint, action)` PAIR, since the same endpoint takes disjoint fields under a read
and a write.

## Example Prompts

Not written yet.

## Out of Scope

- Authoring item **content** → L0176.
- Embedding the Author API authoring experience → L0177.
- Assessment delivery (Items API), analytics (Reports API) → separate sibling dialects,
  neither of which exists. Say no dialect covers it rather than stretching this one.
- Calling the Learnosity API. L0178 holds no credentials and sends no requests.
- Runnable host-language code — the recipe is a language-neutral procedure you
  implement yourself.
