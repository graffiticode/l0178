<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# L0178 Examples

Natural-language requests that exercise the Learnosity **Data API** cookbook. Run these through
the generator to produce examples organically; the programs they yield are the corpus.

They are phrased the way a developer actually asks — data they need out of a Learnosity bank, and
what they intend to do about it — not as descriptions of the vocabulary. Between them they should
reach every part of the modelled surface: all four blocks, every filter, the three session time axes,
response shaping, both paging policies, and the asynchronous job shape.

**Every prompt here must yield a program worth RETRIEVING.** A RAG row is a bare prompt-and-code
pair — the compiler's warnings do not travel with it — so a program carrying a value the vocabulary
tells you not to author teaches that value with nothing to explain it. Prompts whose correct answer
is a refusal, and the two whose programs would bake in an over-maximum `limit` or a hand-authored
`next`, live in `boundary-tests.md` instead. Run those to check the boundary holds; never mark
their output.

**Every request below says HOW FAR IT READS, and names its own references, banks, users and
activities.** That is deliberate, and it is what makes these usable as corpus. The starting
template (`template.gc`) supplies nothing — it is `data-job {}..` — so a program can only contain
what its request gave it. A prompt that never says whether it wants everything or a sample yields
a program with the paging hole, which is CORRECT and is what §"Under-specified requests" is for;
but a corpus made only of those would never demonstrate a complete job. The values here are mocks
and they vary on purpose: an example teaches which slot a value belongs in, and repeating one
literal everywhere would instead teach the literal.

Note the reading intent is usually carried by ordinary words — "all of them", "every", "the full
set", "just the first page", "a sample to eyeball" — not by naming a policy. That is how the
request arrives, and the generator has to hear it.

L0178 returns a developer recipe (via `get_spec`), not item content and not runnable code. It
never calls the API itself.

## Reading Items — `items-get`

1. Pull every published Item tagged Subject: English out of bank 123 so I can index them for search.
2. Fetch Items Grade7_ELA_1021 and Grade7_ELA_1022 with their creation and update dates.
3. I need all the Items in our bank that contain an mcq question — every one, not a sample.
4. Get me one page of archived Items from bank 4021 so I can eyeball the shape of the data.
5. Export the full set of Items created by user author-99 since January, newest first.
6. List every Item in pool winter-2026 rather than the main bank, all of them.
7. I want all Items tagged Grade: 6 or Grade: 7 but not Grade: 5, from bank 88.
8. Give me every unpublished Item in bank 12 along with its max score and who last updated it.
9. Pull all Items whose workflow reference is Default workflow and whose state is Approved.
10. Fetch the Items referenced by our sync manifest — about 400 references — and include dt_created.
11. Get all Items containing question references q-88f2 or q-91ac, complete list.
12. Read every per-dichotomous scored Item in bank 315, sorted by title ascending.
13. I need the whole Item set from bank 100 updated between 1 March and 31 March 2026.
14. Just the first 10 Items from bank 7, sorted by reference — I only want to sanity-check the format.
15. Pull the complete list of Items tagged Standard: CCSS.MATH.5.NF.1 with their dynamic content data.
16. Extract every Item in bank 4021 that has adaptive data attached, all pages.

## Reading session responses — `responses-get`

17. Pull every completed session response for activity numeracy since January.
18. Get all responses for user student_0001 across every activity — the full history.
19. I need the responses for sessions ef4f80b8-e281-41f4-9efd-349b7eb9dd37 and 9c1d2e33-aa10-4f5b-9f22-6b7c1d0e4411.
20. Fetch every response for activities numeracy and writing that were submitted last week.
21. Give me one page of session responses so I can see what the payload looks like.
22. Read all Incomplete and Pending Scoring sessions for activity midterm-2026, oldest first.
23. Pull every session for user u-4412 that STARTED after 1 February, regardless of when it was submitted.
24. I want all sessions for activity final-exam that were COMPLETED before the deadline of 15 May.
25. Extract every response for activity reading-unit-3 together with our stored session metadata field cohort_id.
26. Get all discarded sessions for activity practice-set-2, complete list, so we can audit them.
27. Pull the full set of responses for users student_0001, student_0002 and student_0003 on activity numeracy.
28. Read every session for activity numeracy that was UPDATED in the last 24 hours — we poll this hourly.

## Asynchronous work — `offlinepackage-get` and `jobs-get`

Neither block is paged, so neither takes a paging policy. The producer returns a job reference
and the poll is its own job — a request describing both halves yields two programs, not one.

29. Build an offline device package for items calc-limit-2 and alg-quad-3 out of bank 386.
30. Package activity unit-3-quiz for offline delivery, with the assets under /content.
31. Check whether job dc39cf55-dbfc-4921-bc69-6488307992fc has finished yet.
32. Show me every job that is still queued or running on bank 386.
33. List the jobs created in the last hour so I can see what our nightly export is doing.
34. Build an offline package for these 12 items, returning only the reference and status of the job.

## Requests that raise an advisory warning

Legitimate jobs the compiler accepts but wants to steer. The programs they yield are correct and
worth retrieving; the warning is advisory and rides alongside, not a defect in the code.

35. Get every Item that is NOT tagged Grade: 5 from bank 88.
36. Fetch all Items whose workflow state is Approved.
37. Read all the Items in the bank — no filter, just everything we have.
38. Pull all the published Items — I don't know our bank id, just use the default one.

## Under-specified requests (the compiler should flag the holes)

These withhold the reading intent on purpose — they are the counterpart to everything above, and
the programs they yield should carry holes, not an invented paging policy. Do not "fix" them by
choosing exhaustive.

39. Get the published Items from bank 123.
40. I need the session responses for activity numeracy.
41. Fetch Items tagged Subject: Science.
42. Read the responses for user student_0001.

