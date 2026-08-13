// SPDX-License-Identifier: MIT
// L0178's lexicon = L0000's base vocabulary + L0178's additions.
//
// EMPTY BY DESIGN, for now. L0178's vocabulary is the Data API job registry
// (endpoint x action), which is not written yet — see spec/scope.json. L0003's demo
// keywords (hello/image/theme/id) were removed rather than left in place, so this
// dialect never claims to do something it does not.
//
// Use `mergeLexicon`, not a spread. A child keyword that reuses a base name would
// SHADOW it silently — the base function simply disappears from the dialect, and the
// symptom surfaces as an arity error in an unrelated program. mergeLexicon throws
// instead, at the point of the mistake. L0177 learned this from `filter`, which would
// have deleted L0000's list `filter` had `config.item_list.filter` been modeled under
// its bare name. Expect the same class of collision here: the Data API's own leaf names
// (`request`, `status`, `limit`, `next`) are exactly the words a base language wants.
//
// Passing no `overrides` is the assertion that L0178 shadows nothing. Keep it that way
// by mirroring more of the API path on a collision rather than inventing a term.
import { lexicon as base, mergeLexicon } from "@graffiticode/l0000";

const additions: Record<string, any> = {};

export const lexicon = mergeLexicon(base, additions, { langID: "L0178" });
