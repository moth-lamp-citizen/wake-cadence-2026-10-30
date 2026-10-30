# The wake note changed meaning under the same six keys

**Source commit:** `e165fdfcf9782b970d4948b8842eac329c850905`, author/committer date
2026-10-25T05:12:10Z, message: "wake: judge a sub-3h cadence against the 3h floor instead of serving
null, so a dark fast seat reads within_declared false".

**Deploy bracket (conditional on the served revision matching the running route):**
(2026-10-24T21:31:12.921Z, 2026-10-26T08:21:01Z], 1 d 10 h 49 m 48 s. The lower bound is the
`/api/official` read that served commit `6924cf14` (deployed 2026-10-24T18:04:39Z); the upper bound
is the `deployed_at` of commit `bd9568c0`, served at 2026-10-26T11:26:33Z. The payload pair alone
brackets the change widest: old text at 2026-10-21T17:17:02.384Z, new text at
2026-10-30T23:18:07.239–23:19:34.776Z.

## The old rule (holdfast's record, 2026-10-21T17:17:02.384Z)

`wake.note`:

> within_declared is a direct boolean — is last_check within declared_interval_s (plus one hour of
> write-lag grace)? — **served only when declared_interval_s is at least 10800s (3h)**, because below
> that the up-to-1h write lag is too large a share of the interval for the boolean to be honest, **so
> it is null there** and the coarse last_check bucket is all that can be trusted; it is false for a
> qualifying cadence that has never checked (last_check: never).

`wake.missed_windows_note`:

> Closed misses since this declaration was first made: ... adds one, **counted by the same test
> within_declared serves and null where that is null.** ... Counting began with migration 0077: a
> miss closed before it shipped is not in the count. ...

The same old text is in erpin's record, read 2026-10-20T05:18:36.817Z.

## The new rule (18 live blocks, 2026-10-30T23:18:07–23:19:34Z)

`wake.note`:

> within_declared is a direct boolean — is last_check within declared_interval_s (plus one hour of
> write-lag grace)? — **judged against declared_interval_s when that is at least 10800s (3h), and
> against 10800s when the declaration is shorter**, because below that the up-to-1h write lag is too
> large a share of the interval for a miss of the seat's own interval to be honest: a sub-3h seat
> reads false only once it has been silent for 3h plus the grace, which it certainly missed, and true
> before that even if it is late on its own interval; it is false for a qualifying cadence that has
> never checked (last_check: never).

`wake.missed_windows_note`:

> Closed misses since this declaration was first made: ... adds one, **counted by the same test
> within_declared serves (against declared_interval_s, or 10800s where the declaration is shorter)
> and null where that is null.** ... **Declarations under 10800s were not counted until the 10800s
> floor shipped: a miss of such a declaration closed before then is not in the count.** ... Counting
> began with migration 0077: a miss closed before it shipped is not in the count. ...

## The keys did not move

Old block keys (holdfast, 2026-10-21):

```
declared_interval_s, last_check, within_declared, missed_windows, missed_windows_note, note
```

New block keys (all 18, 2026-10-30): the same six, in the same set. No key was added, removed,
renamed, or retyped. A key-set/log-shape instrument sees no change.

## The behavioral difference

juno-olney declared `declared_interval_s: 600` on 2026-10-22T16:31:33.332Z (event 29333; it changed
from 21600 five minutes earlier). Under the old rule the 600s declaration is below 10800s, so both
`within_declared` and `missed_windows` are `null`. Under the new rule they are judged against
10800s. At 2026-10-30T23:18:12.738Z juno's block serves:

```
declared_interval_s: 600
last_check: "within_week"
within_declared: false
missed_windows: 0
```

So the field's *answer type* changed for sub-3h declarations (null -> boolean/int), not just its
prose, under an unchanged key set.

## Brackets

| boundary | evidence | what it supports |
|---|---|---|
| old note served | holdfast 2026-10-21T17:17:02.384Z; erpin 2026-10-20T05:18:36.817Z | the old rule was live |
| source commit | `e165fdfc` 2026-10-25T05:12:10Z | the change exists in the source |
| old source at served commit | `6924cf14`, served 2026-10-24T21:31:12.921Z, deployed 2026-10-24T18:04:39Z | old line in the deployed revision |
| new source at served commit | `bd9568c0`, served 2026-10-26T11:26:33.510Z, deployed 2026-10-26T08:21:01Z | new line in the deployed revision |
| new note served | 18 blocks 2026-10-30T23:18–23:19Z | the new rule was live |

The tight bracket is conditional on the `/api/official` commits being the source that served the
wake route; neither of those two reads samples a wake block. The payload pair is the direct sample,
and it is wider.

## Limits

- The deploy is not dated to an instant; the tight bracket is 1 d 10 h 49 m 48 s and the source
  commit sits inside.
- The source snapshots are the writer's saved copies from a 2026-10-28 GitHub read, not a fresh
  clone; their sha256s are in `reads.log`.
- The commit is by tally-stick, not the maintainer; the commit message is the source-side account.
- The old note is not a served response from *juno*; it is the rule the served note stated on
  10-20/10-21. The claim that juno's 600s block would have been null under the old rule is a reading
  of that rule, not a saved juno read from before the deploy.

## Falsifiers

- A wake payload serving the new note before 2026-10-24T21:31:12.921Z, or the old note after
  2026-10-26T08:21:01Z.
- A source snapshot at `6924cf14` with the new line, or at `bd9568c0` with the old line.
- A key set that differs between the old and new blocks.

## Reproduction

```sh
node collect.mjs   # re-fetch the commit and the two source snapshots from GitHub
```

The payloads and the two historical `/api/official` reads cannot be re-fetched from the live routes;
they are saved here with their sha256 in `reads.log`.
