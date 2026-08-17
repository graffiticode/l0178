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
//   accepts either, so neither alone is a type error) | records (a list of records
//   validated against a declared element schema, so nested keys and types are checked by
//   the same machinery as a top-level field) | unmodeled (documented by Learnosity but
//   deliberately not modelled here — it reports itself as such rather than as a typo)
export type Constraint = {
  values?: string[];      // accepted values, for string / strings
  max?: number;           // maximum numeric value
  maxEntries?: number;    // maximum list length
  schema?: Fields;        // element schema, for `records`
  required?: string[];    // keys an element must carry, for `records`
};
export type Field = [string, string] | [string, string, Constraint];
export type Fields = Record<string, Field>;

// How a paged read signals that it is finished. THIS DIFFERS PER ENDPOINT FAMILY, and
// using the wrong one is catastrophic in both directions — both verified against the
// live demo consumer, 2026-08-13:
//
//   "next-absent"  (itembank/*)  meta.next is omitted once the result set is exhausted.
//                                Absence is the end signal. Page size means nothing here:
//                                an over-limit request is silently clamped, so every page
//                                can look short while more data remains.
//
//   "empty-page"   (sessions/*)  meta.next is ALWAYS present — it came back even on a
//                                zero-record page, and with the same token, because it is
//                                a long-poll resumption cursor rather than a more-data
//                                flag. Waiting for it to disappear NEVER TERMINATES. The
//                                end signal is a page with no records.
//
// So the rule the other family needs is the rule that breaks this one. Neither can be
// stated as a universal, and `paged: true` alone is not enough to write a loop.
export type PagingEnd = "next-absent" | "empty-page";

export type Block = {
  endpoint: string;      // Learnosity endpoint path, minus the {LTS_VERSION} prefix
  action: string;        // one of get | set | update | delete — the closed verb set
  paged: boolean;        // returns meta.next, so a paging policy is required
  pagingEnd?: PagingEnd; // required when paged — how the loop knows it is done
  async: boolean;        // returns { data: { job_reference } } instead of a result
  // True when the reference documents `organisation_id` as defaulting to the consumer's
  // PRIMARY Item bank. Not universal: on `jobs` the field filters jobs to a bank and no
  // default is documented, so omitting it means unfiltered rather than primary — and an
  // advisory saying "the primary bank is used" would be plainly false there.
  primaryBankDefault?: boolean;
  // Where the job reference sits in an async response. VERIFIED to differ per endpoint,
  // and NOT a documentation error: itembank/offlinepackage returns
  // `data: [{job_reference}]` and itembank/activities/duplicate returns
  // `data: {job_reference}`, each matching its own reference page. So one extraction does
  // not work everywhere — `data.job_reference` is undefined on the array endpoints — and
  // the shape has to travel with the block, like pagingEnd does.
  asyncEnvelope?: "array" | "object";
  // True when the operation PERSISTS. Drives the write-safety warnings, and is not the
  // same as `action !== "get"` — some `get` operations start jobs that mutate.
  writes?: boolean;
  article: string;       // Zendesk article id — provenance for every field below
  fields: Fields;
};

// The head.
export const HEAD = "data-job";

// Blocks. One keyword per (endpoint, action) pair; exactly one per program.
//
// SLICE: 4 of the 57 blocks are modelled. coverage.md lists the rest. A block that is
// not here is not a typo — it is unbuilt, and the compiler says so rather than guessing
// at its fields.
//
// Each was chosen to DISAGREE with what was already modelled, which is the only reason
// the traps below were found rather than assumed:
//   items-get      itembank/*, paged, ends on an absent cursor
//   responses-get  sessions/*, paged, ends on an empty page — the opposite rule
//   jobs-get       not paged at all, and the channel every async operation redeems at
//   offlinepackage-get  async, and an async `get` — the verb says nothing about the shape
export const BLOCKS: Record<string, Block> = {
  "items-get": {
    endpoint: "itembank/items",
    action: "get",
    paged: true,
    pagingEnd: "next-absent",
    async: false,
    primaryBankDefault: true,
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

  "responses-get": {
    endpoint: "sessions/responses",
    action: "get",
    paged: true,
    // NOT "next-absent". Measured: meta.next came back on a zero-record page, with the
    // same token. It is a long-poll resumption cursor here, not a more-data flag.
    pagingEnd: "empty-page",
    async: false,
    article: "26076304385565",
    fields: {
      // who / what
      "session-id": ["session_id", "strings", { maxEntries: 1000 }],
      "user-id": ["user_id", "strings", { maxEntries: 1000 }],
      "activity-id": ["activity_id", "strings", { maxEntries: 1000 }],
      // `status` is a SESSION status here. Same keyword as items-get, disjoint values —
      // which is why fields are scoped to their block rather than to the dialect.
      "status": ["status", "strings", {
        values: ["Incomplete", "Completed", "Discarded", "Pending Scoring"],
      }],
      // Three independent time axes: updated, started, submitted. Picking the wrong one
      // silently changes which sessions match, so each keeps its own keyword.
      "mintime": ["mintime", "timestamp"],
      "maxtime": ["maxtime", "timestamp"],
      "mintime-started": ["mintime_started", "timestamp"],
      "maxtime-started": ["maxtime_started", "timestamp"],
      "mintime-completed": ["mintime_completed", "timestamp"],
      "maxtime-completed": ["maxtime_completed", "timestamp"],
      // response shaping. The path is doubly nested and the kebab name cannot express
      // where the separators fall — the sharpest example yet of why paths are recorded.
      "include-session-metadata": ["include.sessions.session_metadata", "strings"],
      // ordering and windowing
      "sort": ["sort", "string", { values: ["asc", "desc"] }],
      "limit": ["limit", "number", { max: 50 }],
      "next": ["next", "string"],
    },
  },

  // The polling channel. Every async operation anywhere in the API is redeemed here, so
  // this is a legitimate standalone block: a caller polls a job_reference they already
  // hold. Not paged — it has no `next` — and not itself async.
  "jobs-get": {
    endpoint: "jobs",
    action: "get",
    paged: false,
    async: false,
    article: "26076318439197",
    fields: {
      "references": ["references", "strings", { maxEntries: 1000 }],
      // Learnosity documents Default: ["completed"]. It does not behave that way, and
      // MIRRORING the documented default is what breaks a polling loop — see
      // instructions.md §6 and C16. Omitting this field returns every status.
      "status": ["status", "strings", {
        values: ["queued", "running", "halted", "completed"],
      }],
      "include": ["include", "strings"],
      "organisation-id": ["organisation_id", "number"],
      "mintime": ["mintime", "timestamp"],
      "maxtime": ["maxtime", "timestamp"],
      "limit": ["limit", "number", { max: 50 }],
    },
  },

  // An async PRODUCER, and an async `get` — proof that the action verb says nothing about
  // whether an operation is a plain read. It returns a job_reference instead of a result.
  "offlinepackage-get": {
    endpoint: "itembank/offlinepackage",
    action: "get",
    paged: false,
    async: true,
    asyncEnvelope: "array",
    primaryBankDefault: true,
    article: "26076363707421",
    fields: {
      "organisation-id": ["organisation_id", "number"],
      "activity-references": ["activity_references", "strings", { maxEntries: 1000 }],
      // ItemObjects. `item_references` is documented alongside this and is DEPRECATED in
      // favour of it, so it is left out rather than carried — the same treatment L0177
      // gave `item_title`.
      "items": ["items", "records", {
        required: ["reference"],
        schema: {
          "id": ["id", "string"],
          "reference": ["reference", "string"],
          "organisation-id": ["organisation_id", "number"],
        },
      }],
      "base-directory": ["base_directory", "string"],
    },
  },

  // The first WRITE. Verified against sandbox 386 on 2026-08-17, and every one of its
  // hazards is silent: the request succeeds and the damage shows up later.
  //   - `set` REPLACES an Item. Fields omitted from the payload are cleared, not kept.
  //   - `status` defaults to `unpublished`, and an unpublished Item cannot be delivered.
  //   - the response `data` is an empty array — it does not echo what was written.
  //   - `definition` is REQUIRED and must hold at least one widget, so a complete write
  //     is impossible without content composed elsewhere (L0176).
  "items-set": {
    endpoint: "itembank/items",
    action: "set",
    paged: false,
    async: false,
    writes: true,
    primaryBankDefault: true,
    article: "26076386828189",
    fields: {
      "organisation-id": ["organisation_id", "number"],
      "items": ["items", "records", {
        maxEntries: 50,
        required: ["reference", "definition"],
        schema: {
          "reference": ["reference", "string"],
          // Renames an existing Item when sent alongside `reference`.
          "new-reference": ["new_reference", "string"],
          "title": ["title", "string"],
          "description": ["description", "string"],
          "source": ["source", "string"],
          "note": ["note", "string"],
          // Defaults to "unpublished". An Item must be "published" to be used in an
          // assessment, so omitting this writes an Item nothing can deliver.
          "status": ["status", "string", {
            values: ["published", "unpublished", "archived"],
          }],
          "tags": ["tags", "tags"],
          "features": ["features", "strings"],
          "questions": ["questions", "records", {
            required: ["reference"],
            schema: { "reference": ["reference", "string"] },
          }],
          "metadata-acknowledgements": ["metadata.acknowledgements", "string"],
          "metadata-scoring-type": ["metadata.scoring_type", "string", {
            values: ["per-question", "per-dichotomous", "dependent"],
          }],
          "adaptive-difficulty": ["adaptive.difficulty", "number"],
          "authoring-workflow-reference": ["authoring_workflow.reference", "string"],
          "authoring-workflow-state": ["authoring_workflow.state", "string"],
          // CONTENT, and therefore L0176's surface — this dialect moves items, it does
          // not compose them. `definition` is nevertheless REQUIRED by the API, so it is
          // carried as unmodeled rather than omitted: a caller must pass a definition
          // through from wherever the content was authored, and saying "not modelled"
          // is more useful than either silence or a typo error.
          "definition": ["definition", "unmodeled"],
          "dynamic-content-data": ["dynamic_content_data", "unmodeled"],
          "workflow": ["workflow", "unmodeled"],
        },
      }],
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
