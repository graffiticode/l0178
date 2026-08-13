// SPDX-License-Identifier: MIT
// L0178 vocabulary — single source of truth for the lexicon and the compiler.
//
// Every PROPERTY is a kebab-case arity-2 function (value + continuation); chains
// terminate with `{}`. A BLOCK is arity-2 and takes a `[list]` holding one property
// chain. The head is arity-1.
//
// The registry key is the (endpoint, action) PAIR, and each pair gets ONE keyword —
// `items-get` is `itembank/items` + `get`. Modelling the pair as a single keyword
// rather than as two properties is what makes the scoping work: a field's legality
// depends on the pair, not on the endpoint alone (`itembank/items` under `get` takes
// `references`/`limit`/`next`; under `set` it takes an `items` array of definitions —
// disjoint sets). It also sidesteps the base lexicon, where bare `get` and `set` are
// already taken by L0000.
//
// See spec/coverage.md for the whole surface this is a slice of, and for the rules
// that fixed this design: `duplicate` is a path not an action; the action verb does
// not imply read-vs-write; async is a mode carried by 13 individual blocks rather
// than a path prefix; and a block may carry variants selected by a field VALUE
// (`sessions` + `set` on `data_format`) rather than by a third key axis.
//
// Field entries are [apiPath, type, constraint?]. The path is recorded because the
// kebab name alone is ambiguous about its separator: `include-items` is
// `include.items` but `item-pool-id` is `item_pool_id`. The recipe must name exact
// paths, so it is never left to infer them.

// gc token / dispatch tag = UPPER_SNAKE of the kebab keyword.
export const TOK = (kw: string) => kw.toUpperCase().replace(/-/g, "_");

// Value types a field may declare.
//   string | number | strings (list of strings) | tags (Learnosity TagsV2: records of
//   {type, name?}) | timestamp (a UTC Unix integer OR an ISO 8601 string — Learnosity
//   accepts either, so neither alone is a type error)
export type Constraint = {
  values?: string[];      // accepted values, for string / strings
  max?: number;           // maximum numeric value
  maxEntries?: number;    // maximum list length
};
export type Field = [string, string] | [string, string, Constraint];
export type Fields = Record<string, Field>;

export type Block = {
  endpoint: string;   // Learnosity endpoint path, minus the {LTS_VERSION} prefix
  action: string;     // one of get | set | update | delete — the closed verb set
  paged: boolean;     // returns meta.next, so a paging policy is required
  async: boolean;     // returns { data: { job_reference } } instead of a result
  article: string;    // Zendesk article id — provenance for every field below
  fields: Fields;
};

// The head.
export const HEAD = "data-job";

// Blocks. One keyword per (endpoint, action) pair; exactly one per program.
//
// SLICE: only `itembank/items` + `get` is modelled. coverage.md lists the other 56
// blocks. A block that is not here is not a typo — it is unbuilt, and the compiler
// says so rather than guessing at its fields.
export const BLOCKS: Record<string, Block> = {
  "items-get": {
    endpoint: "itembank/items",
    action: "get",
    paged: true,
    async: false,
    article: "26076386828189",
    fields: {
      // filters
      "references": ["references", "strings", { maxEntries: 1000 }],
      "status": ["status", "strings", { values: ["published", "unpublished", "archived"] }],
      "created-by": ["created_by", "strings"],
      "scoring-type": ["scoring_type", "strings", {
        values: ["per-question", "per-dichotomous", "dependent"],
      }],
      "item-pool-id": ["item_pool_id", "string"],
      "organisation-id": ["organisation_id", "number"],
      // authoring_workflow — `reference` is mandatory whenever the object is present
      "authoring-workflow-reference": ["authoring_workflow.reference", "string"],
      "authoring-workflow-states": ["authoring_workflow.states", "strings"],
      // questions
      "questions-references": ["questions.references", "strings", { maxEntries: 1000 }],
      "questions-types": ["questions.types", "strings"],
      // tags. `tags` is a flat list; advanced_tags expresses all/either/none, and
      // `none` may never appear on its own.
      "tags": ["tags", "tags"],
      "advanced-tags-all": ["advanced_tags.all", "tags"],
      "advanced-tags-either": ["advanced_tags.either", "tags"],
      "advanced-tags-none": ["advanced_tags.none", "tags"],
      // response shaping
      "include-items": ["include.items", "strings", {
        values: [
          "adaptive", "dt_created", "dt_updated", "created_by",
          "last_updated_by", "max_score", "dynamic_content_data", "authoring_workflow",
        ],
      }],
      // ordering and windowing
      "sort": ["sort", "string", { values: ["asc", "desc"] }],
      "sort-field": ["sort_field", "string", {
        values: ["created", "updated", "reference", "title"],
      }],
      "mintime": ["mintime", "timestamp"],
      "maxtime": ["maxtime", "timestamp"],
      // paging
      "limit": ["limit", "number", { max: 50 }],
      "next": ["next", "string"],
    },
  },
};

// Top-level properties, carried by the head rather than by a block.
//
// `paging` is DESIGN INTENT, not an API field: it has no Learnosity path and is never
// emitted into a request. It exists because the failure this dialect is built to
// prevent is a truncated read — the API returns a valid response and a well-formed
// record set that is silently incomplete, and `meta.records` counts the CURRENT PAGE,
// not the total. Leaving the policy implicit is how that ships. So on a paged block,
// its absence is a hole.
export const TOPLEVEL: Record<string, [string | null, string]> = {
  "paging": [null, "paging"],
};

// Paging policy tags -> the value carried in the output.
export const PAGING_TAGS: Record<string, string> = {
  "EXHAUSTIVE": "exhaustive",
  "SINGLE-PAGE": "single-page",
};

// --- derived: everything the lexicon and compiler need ---

export const ARITY1: string[] = [HEAD];

// Every field keyword across every block, plus the top-level properties. A name that
// appears in two blocks is ONE keyword with one arity; the fold resolves its meaning,
// exactly as L0177 scopes a member's fields by view.
export const PROPERTIES: string[] = [
  ...new Set([
    ...Object.keys(TOPLEVEL),
    ...Object.values(BLOCKS).flatMap((b) => Object.keys(b.fields)),
  ]),
];
