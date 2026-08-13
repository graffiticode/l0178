<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# L0178 — Learnosity Data API cookbook

> **UNDER CONSTRUCTION. THIS FILE IS EMPTY OF FACTS ON PURPOSE.**
>
> Not one Data API claim has been verified against a live consumer, so none is written
> here. An empty section is a hole a reader can see. A section filled with plausible
> unverified claims is a hole that looks like knowledge, and this dialect exists
> precisely to prevent that. Do not populate a section below by paraphrasing
> Learnosity's documentation and presenting the result as canonical.

## The evidence convention

This is the rule L0177 arrived at after the live Author API contradicted its recipe
repeatedly, and it is the one thing L0178 inherits before it has any content of its own.

- A fact marked **[verified]** was exercised END TO END, and the marking says what
  exercised it — a live request, a specific SDK version, a dated run. "It is in the
  documentation" is not verification, and neither is "it worked once in a way that
  would also have worked if the mechanism were inert."
- Anything not so marked MUST be presented to the reader as documented-but-unconfirmed.
  Carry it, do not drop it; a documented behaviour is useful even unverified, and
  labelling it honestly is what lets a reader decide how much to lean on it.
- Never upgrade a claim's confidence to match how confident the recipe sounds. Emphasis
  must match evidence.

## What makes this API different from L0177's

Recorded here because it determines which of L0177's rules may be copied and which must
NOT be. Both statements below are architectural, not empirical.

- **The Data API is server-to-server.** There is no browser, no DOM anchor, no
  `readyListener`/`errorListener`, and no serving host — so `domain` does not mean what
  it means in L0177, where it is the host serving the editor and the signature binds to
  it. Do not carry that fact across.
- **It does not fail open.** The Author API silently ignores an unrecognised `config`
  key, which is why every L0177 verification step must be differential — run once
  configured, once with the key omitted, and compare. The Data API reports errors
  instead. **Do not copy the differential apparatus into this dialect**; it is a remedy
  for a failure mode this API does not have, and importing it would manufacture
  ceremony that teaches a reader nothing.

## Sections to fill, in priority order

1. **Signing** — how the SDK builds the request, and what the signature covers. The one
   invariant expected to carry over from L0177 is that a signature covers the SERIALIZED
   request, so re-serializing or reordering keys after signing invalidates it. Confirm
   before asserting.
2. **Paging** — the highest-value section. A truncated read is this API's analogue of
   L0177's fail-open: a valid response, a well-formed record set, silently incomplete.
   The recipe must force an explicit choice between one page and exhaustion, and the
   verification step must assert the cursor was exhausted, not that records came back.
3. **The response envelope** — how an API-level error is reported, and how it differs
   from a transport failure. This is what makes a failed job legible.
4. **Endpoints and actions** — which pair answers which question, and the request fields
   legal for each pair.
5. **Write safety** — what a write persists, whether re-running is idempotent, and how
   to stage against a scratch target. Recipe content only: L0178 never writes.

OUT_OF_SCOPE: authoring item **content** (→ L0176); embedding the Author API authoring
experience (→ L0177); assessment delivery (Items API) and analytics (Reports API) —
separate sibling dialects, neither built; calling the Learnosity API at all (this
dialect is documentation-only and holds no credentials); emitting runnable
host-language code (the recipe is language-neutral).
