<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# L0178 Examples

Every example below is written against a construct that exists. `items-get` is the only
block built so far; `spec/coverage.md` lists the other 56.

## A complete read of the whole match set

```
data-job
  paging EXHAUSTIVE
  items-get [
    status ["published"]
    tags [{type: "subject", name: "English"}]
    organisation-id 123
    limit 50
    {}
  ]
  {}..
```

Compiles clean. The recipe's paging loop re-issues the original parameters plus each new
`meta.next` token, and terminates only when `meta.next` is absent.

## Named references, with extra response properties

```
data-job
  paging EXHAUSTIVE
  items-get [
    references ["Grade7_ELA_1021" "Grade7_ELA_1022"]
    include-items ["dt_created" "dt_updated" "authoring_workflow"]
    organisation-id 123
    {}
  ]
  {}..
```

`include-items` resolves to `include.items` — a dot. `organisation-id` resolves to
`organisation_id` — an underscore. That ambiguity is why the output carries a `paths`
map and the recipe copies from it rather than expanding the kebab name.

## Deliberately taking one page

```
data-job
  paging SINGLE-PAGE
  items-get [ status ["archived"] organisation-id 123 limit 10 {} ]
  {}..
```

Accepted, and warns: the result is not the full match set, and nothing in the response
says so. `meta.records` counts what came back.

## The hole this dialect exists for

```
data-job
  items-get [ status ["published"] {} ]
  {}..
```

Incomplete. The design does not say how far it reads, and a truncated read returns HTTP
200 with `meta.status: true` and a well-formed `data` array — so it cannot be caught
downstream. Add `paging EXHAUSTIVE` or `paging SINGLE-PAGE`.

## A time window, sorted

```
data-job
  paging EXHAUSTIVE
  items-get [
    mintime "2026-01-01T00:00:00Z"
    questions-types ["mcq"]
    sort "desc"
    sort-field "created"
    organisation-id 123
    {}
  ]
  {}..
```

`mintime` accepts a UTC Unix integer or an ISO 8601 string; both are documented, so
neither is a type error.

## Combinations the compiler steers away from

```
data-job
  paging EXHAUSTIVE
  items-get [ advanced-tags-none [{type: "grade", name: "5"}] {} ]
  {}..
```

Warns: `advanced_tags.none` may not be used on its own — Learnosity requires `all` or
`either` in the same request.

```
data-job
  paging EXHAUSTIVE
  items-get [ authoring-workflow-states ["Approved"] {} ]
  {}..
```

Warns: the workflow reference is mandatory whenever `authoring_workflow` is part of the
request.
