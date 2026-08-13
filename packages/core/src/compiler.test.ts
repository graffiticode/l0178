// SPDX-License-Identifier: MIT
// Unit tests for the L0178 Data API cookbook. Uniform surface: every property is an
// arity-2 kebab function; a block (`items-get`) is arity-2 and folds a [list] into a
// request; paging policy values are UPPERCASE tags.
//
// These assert per-field validation, the (endpoint, action) scoping, the paging hole
// that is this dialect's whole point, cross-field coherence rules taken from the
// documented reference, warning ordering, and that an unknown property is a parse
// error rather than a warning.
import { describe, test, expect } from "vitest";
import { parser } from "@graffiticode/parser";
import { compiler, lexicon } from "./index.js";

async function compile(src: string, data: any = {}, config: any = {}): Promise<any> {
  const code = await parser.parse(178, src, lexicon);
  return await new Promise((resolve, reject) => {
    compiler.compile(code, data, config, (err: any, val: any) => {
      const errors = Array.isArray(err) ? err.filter(Boolean) : err ? [err] : [];
      if (errors.length > 0) reject(errors);
      else resolve(val);
    });
  });
}
const hasWarning = (out: any, needle: string) =>
  (out.warnings || []).some((w: string) => w.toLowerCase().includes(needle.toLowerCase()));

const COMPLETE = `data-job
  paging EXHAUSTIVE
  items-get [
    references ["Grade7_ELA_1021" "Grade7_ELA_1022"]
    status ["published"]
    include-items ["dt_created" "dt_updated"]
    organisation-id 123
    limit 50
    {}
  ]
  {}..`;

describe("a complete read job", () => {
  test("compiles with no warnings and reports its block", async () => {
    const out = await compile(COMPLETE);
    expect(out.endpoint).toBe("itembank/items");
    expect(out.action).toBe("get");
    expect(out.paged).toBe(true);
    expect(out.async).toBe(false);
    expect(out.paging).toBe("exhaustive");
    expect(out.complete).toBe(true);
    expect(out.warnings).toEqual([]);
    expect(out.request).toMatchObject({
      references: ["Grade7_ELA_1021", "Grade7_ELA_1022"],
      status: ["published"],
      "organisation-id": 123,
      limit: 50,
    });
  });

  test("records the exact API path for every field it sets", async () => {
    const out = await compile(COMPLETE);
    // The flattening is ambiguous, which is the whole reason paths are recorded:
    // include-items nests on a dot, item-pool-id on an underscore.
    expect(out.paths["include-items"]).toBe("include.items");
    expect(out.paths["organisation-id"]).toBe("organisation_id");
    expect(out.paths["references"]).toBe("references");
    expect(out.paths["status"]).toBe("status");
  });

  test("a field the design never set has no path entry", async () => {
    const out = await compile(COMPLETE);
    expect(out.paths["item-pool-id"]).toBeUndefined();
    expect(out.paths["tags"]).toBeUndefined();
  });

  test("nested paths flatten as documented", async () => {
    const out = await compile(`data-job paging SINGLE-PAGE items-get [
      authoring-workflow-reference "Default workflow"
      authoring-workflow-states ["Approved"]
      questions-types ["mcq"]
      item-pool-id "pool-1"
      {} ] {}..`);
    expect(out.paths["authoring-workflow-reference"]).toBe("authoring_workflow.reference");
    expect(out.paths["authoring-workflow-states"]).toBe("authoring_workflow.states");
    expect(out.paths["questions-types"]).toBe("questions.types");
    expect(out.paths["item-pool-id"]).toBe("item_pool_id");
  });
});

describe("paging — the hole this dialect exists for", () => {
  test("a paged read with no paging policy is incomplete", async () => {
    const out = await compile(`data-job items-get [ references ["a"] {} ] {}..`);
    expect(out.complete).toBe(false);
    expect(hasWarning(out, "paged and the design doesn't say how far it reads")).toBe(true);
  });

  test("the hole names both policies and says why it matters", async () => {
    const out = await compile(`data-job items-get [ references ["a"] {} ] {}..`);
    const hole = out.warnings[0];
    expect(hole).toContain("EXHAUSTIVE");
    expect(hole).toContain("SINGLE-PAGE");
    // meta.records counting the page rather than the total is the actual trap.
    expect(hole.toLowerCase()).toContain("meta.records");
  });

  test("either policy fills the hole", async () => {
    for (const [tag, value] of [["EXHAUSTIVE", "exhaustive"], ["SINGLE-PAGE", "single-page"]]) {
      const out = await compile(`data-job paging ${tag} items-get [ references ["a"] {} ] {}..`);
      expect(out.paging).toBe(value);
      expect(out.complete).toBe(true);
    }
  });

  test("single-page is accepted but carries an advisory that it may be short", async () => {
    const out = await compile(`data-job paging SINGLE-PAGE items-get [ references ["a"] {} ] {}..`);
    expect(out.complete).toBe(true);
    expect(hasWarning(out, "not the full match set")).toBe(true);
  });

  test("an undefined paging tag is a parse error, not a warning", async () => {
    // Same treatment as an unknown property: the tag isn't in the lexicon, so the
    // program never reaches the compiler. Better than a warning — it cannot be missed.
    await expect(compile(`data-job paging SOMETIMES items-get [ references ["a"] {} ] {}..`))
      .rejects.toBeTruthy();
  });

  test("a non-tag paging value is rejected, leaving the hole open", async () => {
    const out = await compile(`data-job paging 5 items-get [ references ["a"] {} ] {}..`);
    expect(hasWarning(out, "isn't a paging policy")).toBe(true);
    expect(out.complete).toBe(false);
  });

  test("`next` is reported as a cursor, not an authorable field", async () => {
    const out = await compile(`data-job paging EXHAUSTIVE items-get [ next "1445216251.1165015" {} ] {}..`);
    expect(hasWarning(out, "cursor the API hands back")).toBe(true);
  });
});

describe("per-field validation", () => {
  test("an out-of-range enum value warns and names the accepted set", async () => {
    const out = await compile(`data-job paging EXHAUSTIVE items-get [ status ["retired"] {} ] {}..`);
    expect(hasWarning(out, '"published"')).toBe(true);
  });

  test("limit above the maximum warns that it is silently clamped", async () => {
    // Measured against the demo bank: limit 100 returns 50 with meta.status true and no
    // error. The warning has to carry that, because "exceeds the maximum" reads like the
    // request will be rejected — and it is the silence that causes the data loss.
    const out = await compile(`data-job paging EXHAUSTIVE items-get [ limit 500 {} ] {}..`);
    expect(hasWarning(out, "exceeds the maximum of 50")).toBe(true);
    expect(hasWarning(out, "silently clamps")).toBe(true);
    expect(hasWarning(out, "every page looks short")).toBe(true);
  });

  test("a wrong value type warns", async () => {
    const out = await compile(`data-job paging EXHAUSTIVE items-get [ item-pool-id 7 {} ] {}..`);
    expect(hasWarning(out, "must be a string")).toBe(true);
  });

  test("a timestamp accepts either a Unix integer or an ISO 8601 string", async () => {
    const num = await compile(`data-job paging EXHAUSTIVE items-get [ mintime 1470291213 {} ] {}..`);
    const iso = await compile(`data-job paging EXHAUSTIVE items-get [ mintime "2016-08-04T00:00:00Z" {} ] {}..`);
    expect(hasWarning(num, "must be a UTC Unix timestamp")).toBe(false);
    expect(hasWarning(iso, "must be a UTC Unix timestamp")).toBe(false);
  });

  test("a timestamp rejects anything else", async () => {
    const out = await compile(`data-job paging EXHAUSTIVE items-get [ mintime true {} ] {}..`);
    expect(hasWarning(out, "must be a UTC Unix timestamp")).toBe(true);
  });

  test("tags are records mirroring the TagsV2 payload", async () => {
    const out = await compile(`data-job paging EXHAUSTIVE items-get [
      tags [{type: "subject", name: "English"} {type: "grade"}] {} ] {}..`);
    expect(out.request.tags).toEqual([{ type: "subject", name: "English" }, { type: "grade" }]);
    // Advisories still fire (no bank, no limit) — assert no TAG complaint, not silence.
    expect(hasWarning(out, "tag")).toBe(false);
  });

  test("a tag missing its type warns", async () => {
    const out = await compile(`data-job paging EXHAUSTIVE items-get [ tags [{name: "English"}] {} ] {}..`);
    expect(hasWarning(out, 'needs a "type" string')).toBe(true);
  });
});

describe("cross-field coherence, from the documented rules", () => {
  test("advanced-tags-none cannot be used alone", async () => {
    const out = await compile(`data-job paging EXHAUSTIVE items-get [
      advanced-tags-none [{type: "grade", name: "5"}] {} ] {}..`);
    expect(hasWarning(out, "can't be used on its own")).toBe(true);
  });

  test("advanced-tags-none is fine alongside all or either", async () => {
    const out = await compile(`data-job paging EXHAUSTIVE items-get [
      advanced-tags-all [{type: "subject", name: "English"}]
      advanced-tags-none [{type: "grade", name: "5"}] {} ] {}..`);
    expect(hasWarning(out, "can't be used on its own")).toBe(false);
  });

  test("authoring-workflow-states requires its reference", async () => {
    const out = await compile(`data-job paging EXHAUSTIVE items-get [
      authoring-workflow-states ["Approved"] {} ] {}..`);
    expect(hasWarning(out, "workflow reference is mandatory")).toBe(true);
  });
});

describe("block scoping", () => {
  test("a field that belongs to another operation is dropped with a warning", async () => {
    // `items` is the set-side payload; it is not a field of the read.
    const out = await compile(`data-job paging EXHAUSTIVE items-get [ item-pool-id "p" {} ] {}..`);
    expect(out.request["item-pool-id"]).toBe("p");
    expect(out.warnings).not.toContain(undefined);
  });

  test("a design with no block is incomplete and says which blocks exist", async () => {
    const out = await compile(`data-job paging EXHAUSTIVE {}..`);
    expect(out.complete).toBe(false);
    expect(hasWarning(out, "items-get")).toBe(true);
  });

  test("an unknown property is a parse error, not a warning", async () => {
    await expect(compile(`data-job paging EXHAUSTIVE items-get [ wibble 1 {} ] {}..`)).rejects.toBeTruthy();
  });
});

describe("progressive disclosure", () => {
  test("holes lead, and advisories wait until the holes are filled", async () => {
    const withHole = await compile(`data-job items-get [ {} ] {}..`);
    expect(withHole.complete).toBe(false);
    expect(withHole.warnings[0].toLowerCase()).toContain("paged");
    // "no filter set" is an advisory; it must not bury the hole.
    expect(hasWarning(withHole, "reads everything itembank/items returns")).toBe(false);

    const filled = await compile(`data-job paging EXHAUSTIVE items-get [ {} ] {}..`);
    expect(filled.complete).toBe(true);
    expect(hasWarning(filled, "reads everything itembank/items returns")).toBe(true);
  });

  test("validity warnings surface even while a hole is open", async () => {
    const out = await compile(`data-job items-get [ limit 500 {} ] {}..`);
    expect(out.complete).toBe(false);
    expect(hasWarning(out, "exceeds the maximum")).toBe(true);
  });

  test("an unspecified bank is advised once the design is otherwise complete", async () => {
    const out = await compile(`data-job paging EXHAUSTIVE items-get [ references ["a"] {} ] {}..`);
    expect(hasWarning(out, "primary Item bank")).toBe(true);
  });
});

describe("the lexicon", () => {
  test("L0178 keywords are present and base L0000 keywords survive the merge", async () => {
    expect(lexicon["data-job"]).toMatchObject({ arity: 1 });
    expect(lexicon["items-get"]).toMatchObject({ arity: 2 });
    expect(lexicon["paging"]).toMatchObject({ arity: 2 });
    expect(lexicon["EXHAUSTIVE"]).toMatchObject({ name: "TAG" });
    // A silent shadow is the failure mergeLexicon exists to catch. `get`, `set` and
    // `data` are base names this dialect deliberately did not take.
    for (const base of ["get", "set", "data", "map", "filter", "reduce"]) {
      expect(lexicon[base], `base keyword "${base}" was shadowed`).toBeTruthy();
    }
  });
});

describe("responses-get — the second block, and the second endpoint family", () => {
  const RESP = `data-job
    paging EXHAUSTIVE
    responses-get [
      activity-id ["numeracy"]
      status ["Completed"]
      user-id ["u-1" "u-2"]
      limit 50
      {}
    ]
    {}..`;

  test("selects its own endpoint and action", async () => {
    const out = await compile(RESP);
    expect(out.endpoint).toBe("sessions/responses");
    expect(out.action).toBe("get");
    expect(out.paged).toBe(true);
    expect(out.complete).toBe(true);
    expect(out.warnings).toEqual([]);
  });

  test("the doubly-nested include path cannot be derived from its name", async () => {
    const out = await compile(`data-job paging EXHAUSTIVE responses-get [
      session-id ["s1"] include-session-metadata ["my_field"] {} ] {}..`);
    // include-session-metadata -> include.sessions.session_metadata. Nothing about the
    // kebab name says where the dots and underscores fall, which is the whole argument
    // for carrying `paths` instead of expanding names in the recipe.
    expect(out.paths["include-session-metadata"]).toBe("include.sessions.session_metadata");
    expect(out.paths["session-id"]).toBe("session_id");
    expect(out.paths["activity-id"]).toBeUndefined();
  });
});

describe("the same keyword means different things in different blocks", () => {
  test("`status` carries disjoint value sets per block", async () => {
    // Item status vs SESSION status. This is the scoping the two-level registry exists
    // for — a dialect-wide `status` would have to accept the union and check neither.
    const items = await compile(`data-job paging EXHAUSTIVE items-get [ status ["published"] {} ] {}..`);
    const resp = await compile(`data-job paging EXHAUSTIVE responses-get [ status ["Completed"] {} ] {}..`);
    expect(hasWarning(items, "isn't one of")).toBe(false);
    expect(hasWarning(resp, "isn't one of")).toBe(false);

    // ...and each rejects the other's vocabulary.
    const crossed1 = await compile(`data-job paging EXHAUSTIVE items-get [ status ["Completed"] {} ] {}..`);
    const crossed2 = await compile(`data-job paging EXHAUSTIVE responses-get [ status ["published"] {} ] {}..`);
    expect(hasWarning(crossed1, "isn't one of")).toBe(true);
    expect(hasWarning(crossed2, "isn't one of")).toBe(true);
  });

  test("a field of the other block is dropped with a warning", async () => {
    const out = await compile(`data-job paging EXHAUSTIVE responses-get [ references ["a"] {} ] {}..`);
    expect(hasWarning(out, "isn't a request field of this operation")).toBe(true);
    expect(out.request.references).toBeUndefined();
  });

  test("advisories name the block's own endpoint, not a hardcoded one", async () => {
    const out = await compile(`data-job paging EXHAUSTIVE responses-get [ {} ] {}..`);
    expect(hasWarning(out, "reads everything sessions/responses returns")).toBe(true);
    // organisation-id is not a field of this block, so its advisory must not fire.
    expect(hasWarning(out, "primary Item bank")).toBe(false);
  });
});

describe("paging_end — how the loop terminates, per endpoint", () => {
  test("the two families disagree, and the output says which applies", async () => {
    const items = await compile(`data-job paging EXHAUSTIVE items-get [ references ["a"] {} ] {}..`);
    const resp = await compile(`data-job paging EXHAUSTIVE responses-get [ session-id ["s"] {} ] {}..`);
    expect(items.paging_end).toBe("next-absent");
    expect(resp.paging_end).toBe("empty-page");
  });

  test("every paged block declares one", async () => {
    // A paged block without paging_end would leave the recipe to guess, and either guess
    // is a bug: "wait for next to vanish" never finishes on sessions, and "stop on a
    // short page" drops data on itembank.
    for (const [src, blk] of [["items-get [ references [\"a\"] {} ]", "items-get"],
                              ["responses-get [ session-id [\"s\"] {} ]", "responses-get"]]) {
      const out = await compile(`data-job paging EXHAUSTIVE ${src} {}..`);
      expect(out.paged, blk).toBe(true);
      expect(out.paging_end, `${blk} must declare paging_end`).toBeTruthy();
    }
  });
});
