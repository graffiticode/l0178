// SPDX-License-Identifier: MIT
// Guards the L0178 PROMPTS — spec/spec-directive.md and spec/instructions.md.
//
// For an oracle dialect the prompts are the deliverable, more so than the compiler, and
// a prompt rule is exactly the kind of thing that gets quietly dropped in an edit. Every
// rule asserted here is load-bearing: it either encodes a documented Data API fact the
// recipe gets wrong without it, or it stops L0177's reasoning being imported wholesale
// into a dialect where it does not apply.
//
// WHAT THIS TEST DOES NOT DO: it pins the prompt TEXT, not the generated output. A
// passing run says the rules are still written down. It does not say the generator
// obeyed them.
//
// Match on whitespace-normalized substrings, never exact lines — Prettier reformats
// spec/*.md and would otherwise break these on a reflow. Markdown emphasis (backticks,
// asterisks) is stripped from BOTH sides for the same reason: whether a rule writes
// `meta.records` or meta.records is a formatting choice, and a guard that breaks when
// someone adds emphasis trains people to delete the guard.
import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const specDir = join(dirname(fileURLToPath(import.meta.url)), "..", "spec");
const norm = (s: string) => s.replace(/[`*]/g, "").replace(/\s+/g, " ");
const directive = norm(readFileSync(join(specDir, "spec-directive.md"), "utf-8"));
const instructions = norm(readFileSync(join(specDir, "instructions.md"), "utf-8"));
const register = norm(readFileSync(join(specDir, "conflict-resolution.md"), "utf-8"));
const has = (hay: string, needle: string) => hay.toLowerCase().includes(norm(needle).toLowerCase());

describe("the directive keeps paging as its own section", () => {
  test("paging is a required top-level section, not folded into the procedure", () => {
    expect(has(directive, "## Paging")).toBe(true);
    expect(has(directive, "Never fold it into the Procedure")).toBe(true);
  });

  test("it states that meta.records counts the page, not the total", () => {
    // The single most important sentence in the recipe. A reader who takes records as a
    // total has a number that looks like an answer and is not one.
    expect(has(directive, "meta.records counts the page, not the total")).toBe(true);
    expect(has(instructions, "counts the CURRENT PAGE, not the total match set")).toBe(true);
  });

  test("termination is PER-ENDPOINT, read from paging_end — never a universal rule", () => {
    // The rule each family needs is a bug in the other: waiting for meta.next to vanish
    // never terminates on sessions/*, and stopping on a short page loses data on
    // itembank/*. A directive that stated either as general would ship a broken loop.
    expect(has(directive, "There is no universal paging loop")).toBe(true);
    expect(has(directive, "Read paging_end from the compiled output")).toBe(true);
    expect(has(directive, "Never carry a paging rule from one endpoint to another")).toBe(true);
    expect(has(directive, "stopping when data.length < limit")).toBe(true);
  });

  test("both end-of-data signals are spelled out with the reason each is needed", () => {
    expect(has(directive, "next-absent")).toBe(true);
    expect(has(directive, "empty-page")).toBe(true);
    expect(has(directive, "never terminates")).toBe(true);
    expect(has(directive, "long-poll resumption cursor")).toBe(true);
    expect(has(instructions, "HOW A LOOP TERMINATES IS NOT THE SAME ACROSS ENDPOINTS")).toBe(true);
  });

  test("it carries the measured clamp, which is what makes a size-based loop fail", () => {
    // limit 100 -> 50 records, HTTP 200, no error. Every page then looks short while
    // meta.next is present throughout, so "stop on a short page" drops the rest.
    expect(has(directive, "silently clamped")).toBe(true);
    expect(has(directive, "quits after one page and discards the rest")).toBe(true);
  });

  test("it requires the original request parameters to be carried between pages", () => {
    expect(has(directive, "the original request parameters plus the new")).toBe(true);
  });

  test("the completeness check asserts on the RIGHT end signal, not on records arriving", () => {
    expect(has(directive, "Records came back")).toBe(true);
    expect(has(directive, "the final response carried no")).toBe(true);
    // Asserting on the cursor would never pass on an empty-page endpoint.
    expect(has(directive, "assert the final response carried zero records")).toBe(true);
  });

  test("it says a paging check needs a result set larger than limit to mean anything", () => {
    expect(has(directive, "genuinely larger than")).toBe(true);
  });
});

describe("the directive refuses L0177's differential apparatus", () => {
  test("it names the differential rule and says not to import it", () => {
    expect(has(directive, "Do NOT import")).toBe(true);
    expect(has(directive, "differential")).toBe(true);
  });

  test("it gives the reason — this API reports errors rather than failing open", () => {
    expect(has(directive, "The Data API reports errors")).toBe(true);
    expect(has(instructions, "It does not fail open")).toBe(true);
    expect(has(instructions, "Do not copy the differential apparatus")).toBe(true);
  });
});

describe("transport rules that are binary", () => {
  test("the URL is versioned — the opposite of the Author API's bare host", () => {
    expect(has(directive, "The URL is VERSIONED")).toBe(true);
    expect(has(instructions, "OPPOSITE of the Author API")).toBe(true);
  });

  test("every call is a POST, and the directive says why a reader gets this wrong", () => {
    expect(has(directive, "Every call is a POST")).toBe(true);
    expect(has(directive, "maps `get` onto HTTP GET")).toBe(true);
  });

  test("signing is SDK-only and the signature covers the serialized request", () => {
    expect(has(directive, "never hand-roll")).toBe(true);
    expect(has(directive, "do not re-serialize or reorder keys after signing")).toBe(true);
  });
});

describe("the envelope and its traps", () => {
  test("meta.status is called out as separate from the HTTP status", () => {
    expect(has(directive, "meta.status` is separate from the HTTP status")).toBe(true);
    expect(has(instructions, "separate from the HTTP status")).toBe(true);
  });

  test("a truncated read is named as indistinguishable from a complete one", () => {
    expect(has(directive, "truncated read looks exactly like a complete one")).toBe(true);
  });

  test("41003's own error message is flagged as misleading for this API", () => {
    // Measured: a bad secret returns 403/41003 whose message tells you to compare
    // security.domain with the browser's location.hostname. There is no browser here.
    expect(has(directive, "its message is misleading here")).toBe(true);
    expect(has(instructions, "There is no browser in a Data API call")).toBe(true);
  });

  test("not every response is JSON, and the directive says so", () => {
    expect(has(directive, "Not every response is JSON")).toBe(true);
    expect(has(instructions, "body is NOT JSON")).toBe(true);
  });

  test("the unreproduced HTTP-vs-HTTPS claim is marked unresolved, not asserted", () => {
    expect(has(instructions, "did not reproduce and is UNRESOLVED")).toBe(true);
    // An open conflict must stay traceable to the register, which records what would
    // close it. A claim quietly resolved in favour of whichever source was read last is
    // the failure this dialect cannot afford.
    expect(has(instructions, "conflict-resolution.md")).toBe(true);
    expect(has(register, "C5 — HTTP-not-HTTPS response code · **OPEN**")).toBe(true);
  });

  test("rate limits are per endpoint over a 5-second window", () => {
    expect(has(directive, "per endpoint, over a 5-second window")).toBe(true);
    expect(has(instructions, "Limits are per individual endpoint")).toBe(true);
  });
});

describe("paths and naming", () => {
  test("paths come from the compiled map and must be reproduced verbatim", () => {
    expect(has(directive, "must REPRODUCE that map")).toBe(true);
    expect(has(directive, "Never derive a path from a key name")).toBe(true);
  });

  test("it gives the ambiguity that makes derivation unsafe", () => {
    expect(has(directive, "include-items` is `include.items")).toBe(true);
    expect(has(directive, "item-pool-id` is `item_pool_id")).toBe(true);
  });

  test("a key absent from the map was rejected and must be left out", () => {
    expect(has(directive, "was rejected by the compiler: leave it out entirely")).toBe(true);
  });

  test("the wire uses the endpoint and action, never the block keyword", () => {
    expect(has(directive, "not the block keyword")).toBe(true);
  });
});

describe("facts that stop a wrong recipe", () => {
  test("read-vs-write is never inferred from the action verb", () => {
    expect(has(directive, "Never infer read-vs-write from the action verb")).toBe(true);
    expect(has(instructions, "does not tell you whether an operation writes")).toBe(true);
  });

  test("an async job gets a polling loop, not a paging loop", () => {
    expect(has(directive, "Write the polling loop instead of a paging loop")).toBe(true);
    expect(has(instructions, "Paging and async are disjoint")).toBe(true);
  });

  test("`next` is a cursor, never authored", () => {
    expect(has(directive, "never a value to author")).toBe(true);
  });
});

describe("honesty about evidence", () => {
  test("the evidence convention distinguishes verified from documented", () => {
    expect(has(instructions, "[verified]")).toBe(true);
    expect(has(instructions, "[documented]")).toBe(true);
    expect(has(instructions, "exercised END TO END")).toBe(true);
  });

  test("verified facts carry their provenance", () => {
    expect(has(instructions, "public demo")).toBe(true);
    expect(has(instructions, "learnosity-sdk-nodejs")).toBe(true);
  });

  test("a demo-bank verification is not overstated as a promise to the reader", () => {
    expect(has(instructions, "verified for the DEMO ITEM BANK")).toBe(true);
    expect(has(directive, "never let a fact verified on the demo bank read as a promise")).toBe(true);
  });

  test("the 'no holes, nothing left to do' trap is closed", () => {
    // A design with no holes can still be operationally blocked; L0177 learned this.
    expect(has(directive, 'Never write "no holes, nothing left to do."')).toBe(true);
    expect(has(directive, "still unverified before this can work")).toBe(true);
  });

  test("a step that cannot fail is not a check", () => {
    expect(has(directive, "A step that cannot fail is not a check")).toBe(true);
  });
});

describe("the conflict register", () => {
  test("it refuses to resolve a conflict by picking the tidier answer", () => {
    expect(has(register, "An unresolved conflict stays unresolved in writing")).toBe(true);
    expect(has(register, "a resolution records what settled it")).toBe(true);
  });

  test("the two cross-dialect conflicts with L0177 are recorded, not smoothed over", () => {
    // domain means different things in each API, and L0177's differential discipline
    // does not transfer. Resolving either "consistently" would have been the bug.
    expect(has(register, "domain means different things per API")).toBe(true);
    expect(has(register, "Whether verification must be differential")).toBe(true);
    expect(has(register, "the wrong resolution would have looked like consistency")).toBe(true);
  });

  test("measured facts are scoped to what was actually exercised", () => {
    expect(has(register, "public demo Item bank")).toBe(true);
    expect(has(register, "It does not say the reader's consumer")).toBe(true);
  });
});

describe("output hygiene", () => {
  test("no runnable host-language code, and no mention of the dialect itself", () => {
    expect(has(directive, "Do NOT emit runnable host-language code")).toBe(true);
    expect(has(directive, "Do NOT mention Graffiticode")).toBe(true);
  });

  test("the recipe covers only the operation the design asked for", () => {
    expect(has(directive, "do not cover operations the design did not ask for")).toBe(true);
  });
});
