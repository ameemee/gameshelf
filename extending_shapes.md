# Extending the shapes — worked examples

Each example below shows what to change, where, and what the compiler will
tell you afterward. The point of the type model is that every extension is a
**localized edit plus compiler-enforced fallout** — you never have to remember
what else needs updating.

---

## Example 1: Adding a new dimension

**Scenario:** the group decides "setup time" should participate in the
recommendation.

**Files to change: `src/data/dimensions.ts` only.**

```ts
export const DIMENSIONS = [
  "players",
  "energy",
  "divisiveness",
  "setupTime",
] as const;

export const DIMENSION_META: Record<DimensionId, { label: string }> = {
  players: { label: "Number of players" },
  energy: { label: "Energy required" },
  divisiveness: { label: "Divisiveness" },
  setupTime: { label: "Setup time" },
};
```

**What the compiler then tells you:**

- `src/domain/types.ts` — no error. `DimensionVector` and `Preferences` are
  `Record<DimensionId, …>` / `Partial<Record<DimensionId, …>>`, so they widen
  automatically.
- `src/data/games.ts` — **one compile error per game**, each saying
  `Property 'setupTime' is missing in type '{ players: …; energy: …; divisiveness: …; }'
but required in type 'DimensionVector'`. Exactly the games you need to edit.
- Every component that iterates `DIMENSIONS` picks the new entry up for free —
  `PreferenceControls` gets a slider automatically, `RegistryList` and
  `RecommendationList` display the new column automatically.
- `recommend.ts` — no change. The distance calculation iterates over active
  preference keys, so a new dimension is included the moment a user sets it.

**Then you:** add `setupTime: N` to each game in `games.ts`. Done.

---

## Example 2: Adding metadata to a dimension

**Scenario:** you want each dimension to carry a short description, so
`PreferenceControls` can show a tooltip.

**Files to change: `src/data/dimensions.ts` only.**

```ts
export const DIMENSION_META: Record<
  DimensionId,
  { label: string; description: string }
> = {
  players: {
    label: "Number of players",
    description: "How many people the game is best with.",
  },
  energy: {
    label: "Energy required",
    description: "How much focus/engagement it demands.",
  },
  divisiveness: {
    label: "Divisiveness",
    description: "How likely it is to create arguments or grudges.",
  },
};
```

**What the compiler then tells you:**

- **One compile error per entry** in `DIMENSION_META` until you fill in the
  new `description` field. This is the `Record<DimensionId, { … }>` annotation
  doing its job — it's not just "there are keys for every dimension," it's
  "every entry has exactly this shape."
- No errors anywhere else — `DimensionId` is unchanged, so `Game`,
  `Preferences`, and all consumers still typecheck. The new field is
  _optional from the consumer's perspective_: components that don't read
  `description` don't break.

**Why this works cleanly:** `DIMENSION_META` is the _only_ place dimension
metadata lives. Consumers that want the new field (say, `PreferenceControls`
adding a `title={description}` attribute) change in one file; consumers that
don't, don't.

---

## Example 3: Adding a field to `Game`

**Scenario:** you want to show each game's publisher or a cover-art URL on the
registry list.

**Files to change: `src/domain/types.ts` and `src/data/games.ts`.**

```ts
// src/domain/types.ts
export interface Game {
  id: string;
  name: string;
  dimensions: DimensionVector;
  instructionsId: InstructionsId;
  publisher?: string; // optional — old games don't have to fill it in
  coverUrl?: string;
}
```

**What the compiler then tells you:**

- **Nothing**, if you make the field optional (`publisher?: string`). Existing
  game objects stay valid; you can fill in `publisher` incrementally as you
  find the info.
- **One compile error per game** if you make it required (`publisher: string`).
  Every game object in `games.ts` needs the field added. This is the right
  choice when "every game must have this" is a real invariant — the same
  philosophy as `instructionsId`.

**Choosing between optional and required:** follow the spec's own line —
"every game is complete" is the guiding philosophy, so prefer required unless
there's a genuine "we don't know this yet" case. `publisher` is a good example
of the latter; `name` is clearly the former.

**Where to consume it:** `RegistryList.tsx` and `RecommendationList.tsx`
each render `game.publisher` (conditionally, if optional). Because they take
`Game` as a prop type, they'll pick up the new field with no other changes.

---

## Example 4: Adding a new recommendation output field

**Scenario:** you decide the results list should show each game's distance
(the spec says "not displayed — can add later").

**Files to change: `src/domain/recommend.ts` and `RecommendationList.tsx`.**

The current signature is:

```ts
export function recommend(prefs: Preferences, games: Game[]): Game[];
```

**Option A — change the return type** (recommended):

```ts
export interface RankedGame {
  game: Game;
  distance: number;
}

export function recommend(prefs: Preferences, games: Game[]): RankedGame[] {
  // …
  return games
    .map((g, i) => ({ g, i, d: euclidean(prefs, g, active) }))
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .map(({ g, d }) => ({ game: g, distance: d }));
}
```

**What the compiler then tells you:**

- **One compile error** in `recommend.test.ts` wherever it asserts on the
  output shape (e.g. `expect(result[0]).toBe(games[0])` becomes invalid).
  Tests force you to decide what the new contract means.
- **One compile error** in `App.tsx` or wherever `RecommendationList` is
  rendered: the prop type changes from `Game[]` to `RankedGame[]`, and the
  compiler flags the mismatch.
- `RecommendationList.tsx` itself: `props.games[0].name` becomes
  `props.games[0].game.name`. Straightforward, compiler-guided.

**Option B — add a sibling function** (`recommendWithDistances`) and leave
`recommend` alone. Cleaner if other callers depend on the old shape, but for
v1 with one caller, Option A is simpler and the compiler handles the fallout.

---

## Example 5: Removing a dimension (the inverse of Example 1)

**Scenario:** the group drops "divisiveness" — it turns out everyone has
strong opinions and the score is never useful.

**Files to change: `src/data/dimensions.ts` only.**

```ts
export const DIMENSIONS = ["players", "energy"] as const;

export const DIMENSION_META: Record<DimensionId, { label: string }> = {
  players: { label: "Number of players" },
  energy: { label: "Energy required" },
};
```

**What the compiler then tells you:**

- `src/data/games.ts` — **one compile error per game**, each saying
  `Object literal may only specify known properties, and 'divisiveness' does
not exist in type 'DimensionVector'`. That's the excess-property check
  catching stale data. Delete the `divisiveness:` entries.
- `src/domain/types.ts`, `recommend.ts`, all components — **no errors.**
  Everything was written against `DimensionId`, not against the literal
  string `"divisiveness"`. This is the payoff of never hardcoding dimension
  keys anywhere except `dimensions.ts`.
- `src/domain/recommend.test.ts` — if any test hardcodes `"divisiveness"` as
  a preference key, it becomes a compile error. Tests that use
  `DIMENSIONS[i]` or iterate programmatically are unaffected.

**Gotcha to watch for:** persisted preferences (none in v1, but if v2 adds
`localStorage` persistence) would contain a `divisiveness` key the app no
longer understands. `recommend` filters preferences against active
dimensions implicitly via the `DIMENSIONS`-derived `DimensionId`, but a
stored `{ divisiveness: 4 }` object would be structurally valid only if
`divisiveness` still existed. This is a v2 problem, not v1 — but it's why
the spec defers persistence.

---

## Example 6: Adding a whole new shape (not a field, a concept)

**Scenario:** you want to support "variants" — Catan has "base" and "Cities &
Knights," each with slightly different dimension values.

**Files to change:** a new file in `src/data/` plus small edits to `types.ts`
and `games.ts`.

This is the least-mechanical case because it's a _new_ shape, not an
extension of an existing one. The process:

1. Decide whether a variant _is a game_ (option: flatten — `"catan-base"`,
   `"catan-cities-knights"` as two `Game` records, no type changes needed) or
   whether it's a _sub-record_ inside a game.
2. If flattening (recommended for v1 — simpler, no new shape):
   - No type changes.
   - Add new `Game` records to `games.ts`.
   - Add `.txt` stubs and `INSTRUCTIONS` entries.
   - The compiler enforces completeness exactly as before. Zero new
     concepts.
3. If nesting (`Game.variants: Variant[]`):
   - Define `Variant` in `types.ts` (probably `Omit<Game, "id" | "variants">` —
     a variant has the same dimensions and instructions, but doesn't
     recursively have variants).
   - Add `variants?: Variant[]` to `Game` (optional — most games have none).
   - `recommend` needs a policy: does it rank variants or games? If variants,
     the flattening approach was probably right after all. If games, it uses
     the base game's dimensions and ignores variants for scoring.
   - This is where the spec's "open items" list would grow — it's a
     _semantic_ change, not a mechanical one, and worth an explicit decision
     before touching types.

**The general rule:** if adding the concept requires changing the
recommendation algorithm's _meaning_ (what gets ranked), it deserves a
discussion. If it's purely additive to what gets _displayed_, the type model
absorbs it cheaply via Examples 2–4.

---

## The pattern, summarized

| Change                       | Files to edit                     | Compiler tells you…                            |
| ---------------------------- | --------------------------------- | ---------------------------------------------- |
| New dimension                | `dimensions.ts`                   | Every game missing a value                     |
| New dimension metadata       | `dimensions.ts`                   | Every `DIMENSION_META` entry missing the field |
| New `Game` field (optional)  | `types.ts`                        | Nothing — additive                             |
| New `Game` field (required)  | `types.ts` + `games.ts`           | Every game missing the value                   |
| New `recommend` output       | `recommend.ts` (+ tests, callers) | Test assertions + caller type mismatches       |
| Remove a dimension           | `dimensions.ts`                   | Every game with a stale key (excess property)  |
| New concept (variants, etc.) | _discussion first_, then types    | Depends on choice — flatten is free            |

The invariant that makes all of this work: **`DimensionId`, `InstructionsId`,
and `Game` are the only things anything else references.** As long as
consumers talk to those types rather than to raw strings or ad-hoc object
shapes, every extension is localized and every omission is a compile error.
