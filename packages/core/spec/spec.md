<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# L0178 Vocabulary

This specification documents dialect-specific functions available in the
**L0178** language of Graffiticode. These functions extend the core language
with additional functionality tailored to L0178 use cases.

The core language specification including the definition of its syntax,
semantics and base library can be found here:
[Graffiticode Language Specification](./graffiticode-language-spec.html)

## Structure

A program is one `data-job` head carrying a paging policy and exactly one block
function, terminated with `{}` then `..`.

| Construct | Arity | Shape |
| :-------- | :---: | :---- |
| `data-job` | 1 | Head; takes the whole property + block chain. |
| Blocks: `items-get` | 2 | Take a `[list]` of request fields; select the endpoint and action. |
| `paging` | 2 | Design intent: `EXHAUSTIVE` or `SINGLE-PAGE`. Never sent in a request. |
| Request fields | 2 | `name value`, chained; the chain ends with `{}`. |

## Blocks

One keyword per `(endpoint, action)` pair. A field's legality depends on the pair, not
on the endpoint alone.

| Block | Endpoint | Action | Paged | Async |
| :---- | :------- | :----- | :---: | :---: |
| `items-get` | `itembank/items` | `get` | yes | no |

## Request fields of `items-get`

Each field's exact Learnosity path is recorded in the compiled output's `paths` map,
because the kebab name alone is ambiguous about its separator.

| Field | Learnosity path | Type |
| :---- | :-------------- | :--- |
| `references` | `references` | list of strings (max 1000) |
| `status` | `status` | `published` `unpublished` `archived` |
| `created-by` | `created_by` | list of strings |
| `scoring-type` | `scoring_type` | `per-question` `per-dichotomous` `dependent` |
| `item-pool-id` | `item_pool_id` | string |
| `organisation-id` | `organisation_id` | number |
| `authoring-workflow-reference` | `authoring_workflow.reference` | string |
| `authoring-workflow-states` | `authoring_workflow.states` | list of strings |
| `questions-references` | `questions.references` | list of strings (max 1000) |
| `questions-types` | `questions.types` | list of strings |
| `tags` | `tags` | TagsV2 records `{type, name?}` |
| `advanced-tags-all` | `advanced_tags.all` | TagsV2 records |
| `advanced-tags-either` | `advanced_tags.either` | TagsV2 records |
| `advanced-tags-none` | `advanced_tags.none` | TagsV2 records |
| `include-items` | `include.items` | response properties to return |
| `sort` | `sort` | `asc` `desc` |
| `sort-field` | `sort_field` | `created` `updated` `reference` `title` |
| `mintime` | `mintime` | Unix integer or ISO 8601 string |
| `maxtime` | `maxtime` | Unix integer or ISO 8601 string |
| `limit` | `limit` | number (max 50) |
| `next` | `next` | string — a cursor the API returns, not a value to author |

## Paging

`paging` is required on a paged block. `EXHAUSTIVE` follows `meta.next` until it is
absent; `SINGLE-PAGE` deliberately takes one page and accepts an incomplete result.
The policy is design intent and never appears in a request.
