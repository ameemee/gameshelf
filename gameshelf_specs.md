# Games Picker — Design Proposal

**Status:** Agreed design, pre-implementation. This document captures decisions made in discussion; game and dimension data are still pending.

---

## 1. Purpose

A web application for a group of friends who play online multiplayer games. It serves two roles:

- **Registry** — displays all games the group knows about, each annotated with a set of scored attributes ("dimensions").
- **Registrar / Recommender** — accepts a user's preferences across those dimensions and returns the games that best match, ranked by Euclidean distance.

---

## 2. Scope

### v1 (this proposal)

- Static registry: games rendered from a hardcoded data array. No add/edit through UI. No filtering or sorting.
- Preference controls: one per dimension, integer 0–10, with an explicit "N/A / unset" state.
- Recommend button: disabled until at least one dimension is set.
- Recommendation results: full ranked list of all valid games (no top-K cutoff), each shown with its dimension values alongside the game name.
- **Per-game playing instructions**, stored as one text file per game and shown in a popup when the user clicks a "Game instructions" button on a game.
- Stateless: no persistence of preferences between sessions.

### Deferred (explicitly out of v1)

- Nicer UI / richer presentation.
- Filtering and sorting on the registry list.
- Adding/editing games via the UI.
- Storing games in a database.
- Persisting preferences.

---

## 3. Architecture

**Stack:** TypeScript + React + Vite, deployed as a static SPA on Vercel. No backend in v1. Client-side computation is sufficient for the dataset size.

**Style: data-oriented, not OOP.** Games are plain typed objects; recommendation logic is a pure function over that data. Rationale:

- A database stores _values_, not _methods_. Behavior on the object (`game.distanceTo(...)`) does not survive a round-trip through storage, forcing mapper/hydration code on every read and write. Plain data _is_ the storage shape, so the DB boundary is free.
- Behavior attached to the object couples the recommendation algorithm to the `Game` type, complicating algorithm swaps, testing, and fetching games from an API without instantiation.
- A data-only class would be nearly equivalent to plain types; the cost comes from _behavior_ on the object, not the `class` keyword. Plain types are chosen for simplicity and a clean future DB boundary.

**Scalability hooks:**

- All games live in a single `GAMES: Game[]` array in one module. Migrating to a database or API means replacing that import with a fetch; every downstream consumer already accepts `Game[]`.
- Dimensions are a single source of truth (a tuple + a label map). Adding a dimension is one line in the tuple and one label entry, after which TypeScript flags every game missing a value.
- Instructions are addressed by a stable id, not a file path, so the storage mechanism (bundled text → `public/` files → database) can change without touching the `Game` record.

---

## 4. Data Model

```ts
// Dimensions: a string-literal union derived from a single tuple
export const DIMENSIONS = ["players", "energy", "divisiveness"] as const; // placeholder keys
export type DimensionId = (typeof DIMENSIONS)[number];

export const DIMENSION_META: Record<DimensionId, { label: string }> = {
  players: { label: "Number of players" },
  energy: { label: "Energy required" },
  divisiveness: { label: "Divisiveness" },
};

// A game is pure data; every dimension is required by the type
export type DimensionVector = Record<DimensionId, number>; // integers 0–10

export interface Game {
  id: string; // stable key for React lists and future DB rows
  name: string;
  dimensions: DimensionVector;
  instructionsId: InstructionsId; // stable key into the instructions map
}

// Preferences: only dimensions the user has set (N/A = key absent)
export type Preferences = Partial<Record<DimensionId, number>>;
```

```ts
// Instructions: the txt files are imported as raw strings at build time.
// The map is the single source of truth; InstructionsId is derived from it.
import catanInstructions from "./gameSpecs/catan.txt?raw";
// ...one import per game

export const INSTRUCTIONS = {
  catan: catanInstructions,
  // ...
} as const;

export type InstructionsId = keyof typeof INSTRUCTIONS;
```

**Guarantees and decisions:**

- **All dimensions present.** `Record<DimensionId, number>` makes a missing dimension a compile-time error, satisfying the requirement that every game has every dimension filled out. (An OOP `Record<string, number>` would only fail at runtime.)
- **Integer scale.** Every dimension value and preference is an integer in 0–10 inclusive.
- **`Dimension` is a key, not an object.** Dimensions are identified by string keys in a record, not by objects with embedded `id` fields.
- **No separate player-count field.** Player count is a dimension like any other so that it participates in the distance calculation. A standalone `min_num_players_required` field would sit outside the vector and could never match a preference. (Can be reintroduced later as display/filter metadata if needed, without touching the vector.)
- **Unset preference = absent key.** The "N/A" slider state is represented as the dimension simply not being present in `Preferences`.
- **Instructions are a reference, not inline text.** `Game.instructionsId` is a stable key, not a file path. The path would break after Vite bundles/renames assets and would be meaningless once games move to a database; the id survives both.
- **Instructions link is compile-checked.** `InstructionsId = keyof typeof INSTRUCTIONS` means a game pointing at a nonexistent instructions entry is a compile error — the same guarantee as dimensions.
- **Instructions are required.** Every game must have an `instructionsId`, consistent with the "every game is complete" philosophy. (If some games genuinely won't have instructions, make it optional later and hide/disable the button when absent.)
- **Instructions are bundled at build time (Option A).** Each `.txt` is imported with Vite's `?raw` suffix, which bakes the file's text into the bundle as a string. No runtime `fetch`, no CORS, no path issues, works offline and on Vercel with zero config. Trade-off: every instruction file ships to every client even if never opened — fine for a friends-only tool with a handful of games. If instruction texts grow large or numerous, switch to storing them in `public/` and fetching lazily; that is a one-file change in `data/instructions.ts`.

---

## 5. Recommendation Algorithm

**Procedure:**

1. Determine the set of _active_ dimensions: those present in `Preferences`.
2. If no dimensions are active, return an empty list (the UI also disables the button, so this is a defensive case).
3. For each game, compute Euclidean distance to the preference vector **using only active dimensions**; unset dimensions are omitted from the sum.
4. Sort ascending by distance. Break ties by original processing order (made explicit as an index comparison rather than relying on sort stability).
5. Return the full ranked list — **no K cutoff**. Since distance must be computed against every game anyway, all valid games are returned ranked.

**Properties:**

- Games are never excluded for having an _unset_ dimension; unset dimensions are ignored on both sides.
- No normalization or per-dimension weighting in v1. All dimensions share the same 0–10 integer scale, so raw values are directly comparable. (If dimensions with different scales are added later, normalization/weighting would need revisiting.)
- The function is pure and returns a new array without mutating input.

**Sketch:**

```ts
export function recommend(prefs: Preferences, games: Game[]): Game[] {
  const active = (Object.keys(prefs) as DimensionId[]).filter(
    (d) => prefs[d] !== undefined,
  );
  if (active.length === 0) return [];

  return games
    .map((g, i) => ({ g, i, d: euclidean(prefs, g, active) }))
    .sort((a, b) => a.d - b.d || a.i - b.i) // distance, then processing order
    .map(({ g }) => g);
}
```

---

## 6. UI

### Registry list

- Plain, static list of every game in `GAMES`.
- v1 shows games without filtering or sorting.
- Each game row has a **"Game instructions"** button that opens the instructions popup for that game.

### Preference controls

- One control per dimension.
- Each control has an explicit **N/A / unset** state in addition to the 0–10 range. Conceptually N/A sits to the left of 0.
- Implementation note: native `<input type="range">` has no off-state, so each dimension will likely be a small composite control (e.g. an enable toggle plus a 0–10 slider disabled until enabled, or a segmented control) presented so that N/A reads as the leftmost position. The _concept_ of N/A-at-left is preserved even if it is not a single native slider.

### Recommend button

- Disabled (non-interactive, greyed out) until at least one dimension is set.
- On activation, runs `recommend` and renders the results.

### Recommendation results

- A ranked list. Each row shows the game name with its dimension values displayed alongside.
- Each row also has a **"Game instructions"** button that opens the same instructions popup.
- Ranked order only; distance/score is not displayed (per current agreement — can add later).

### Instructions popup

- A modal/dialog showing the instruction text for the selected game.
- Opened by the "Game instructions" button on any game row (registry or results).
- Rendered as plain text with line breaks preserved (`white-space: pre-wrap`). If richer formatting is wanted later, the `.txt` files can become `.md` and a small Markdown renderer added; nothing else changes.
- Closes on close button, Escape, or backdrop click. Use the native `<dialog>` element or a small modal component — no dependency needed.
- The modal receives the instruction text as a prop; it does not know where the text came from, keeping the visuals layer decoupled from storage.

---

## 7. Project Layout

Here's the tree again, then each file in plain language.

```text
gameshelf/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vercel.json
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── data/
    │   ├── dimensions.ts
    │   ├── games.ts
    │   ├── instructions.ts      # imports the .txt files with ?raw, exports INSTRUCTIONS
    │   └── gameSpecs/           # one .txt per game
    │       ├── catan.txt
    │       └── ...
    ├── domain/
    │   ├── types.ts
    │   ├── recommend.ts
    │   └── recommend.test.ts
    └── components/
        ├── RegistryList.tsx
        ├── PreferenceControls.tsx
        ├── RecommendationList.tsx
        └── InstructionsModal.tsx
```

### The three layers (the important idea)

Think of it as three layers, from "outside the app" to "inside the app":

1. **Config files** (top level) — the stuff that tells the computer _how to build and run_ the project. You rarely touch these after setup.
2. **The app shell** (`main.tsx`, `App.tsx`) — the front door and the main room.
3. **The working parts** (`data/`, `domain/`, `components/`) — where the actual logic and UI live, split by _what kind of thing they are_:
   - `data/` = the facts (what games, what dimensions, what instructions).
   - `domain/` = the rules (how recommendation works).
   - `components/` = the visuals (what you see on screen).

That split is the whole point: **facts, rules, and visuals never mixed together.** That's what makes it easy to change one without breaking the others.

---

### Top-level files (config — set up once, rarely touched)

**`index.html`**
The single web page the whole app lives in. It's basically an empty page with a `<div id="root">` and a link to the app's JavaScript. React fills that empty div with your app. You almost never edit this.

**`package.json`**
The project's ID card and shopping list. It says the project's name, the commands you can run (`npm run dev`, `npm run build`), and the list of libraries the project depends on (React, Vite, Vitest). When you run `npm install`, it reads this file to know what to download.

**`tsconfig.json`**
Settings for the TypeScript compiler — how strict the type-checking should be, where the source files are, etc. This is what makes "a game missing a dimension is a compile error" actually happen. Set up once.

**`vite.config.ts`**
Settings for Vite (the build tool). Vite is what runs your app locally while you develop (with instant reload) and bundles it into static files for deployment. This file is where you'd tweak build behavior if needed. Mostly untouched.

**`vercel.json`**
Settings specific to Vercel (where you deploy). Tells Vercel how to build the site and, for a single-page app, to route all URLs back to `index.html` so client-side routing doesn't 404 on refresh. Only matters at deploy time.

---

### The app shell

**`src/main.tsx`**
The starting point of the JavaScript. Its only job: find the empty `<div id="root">` in `index.html`, and tell React "render `<App />` into here." Tiny file, runs first, then gets out of the way.

**`src/App.tsx`**
The main room. It holds the overall state (the current preferences the user has set, and which game's instructions popup is open, if any) and lays out the pieces: the registry list, the preference controls, the recommend button, the results, and the instructions modal. It wires the components together and passes data down. Think of it as the page's floor plan.

---

### `src/data/` — the facts

**`dimensions.ts`**
Defines _what dimensions exist_ and _what to call them_. It holds the list of dimension keys (`players`, `energy`, `divisiveness`) and their human-readable labels ("Energy required"). This is the single source of truth — add a dimension here and TypeScript immediately flags every game missing a value.

**`games.ts`**
The actual list of games, each with its dimension values and its `instructionsId`. Right now it's a hardcoded array (`GAMES: Game[]`). Later, to use a database or API, you change _only this file_ (swap the array for a fetch) — nothing else in the app needs to know the difference, because everything downstream just receives a `Game[]`.

**`instructions.ts`**
The lookup that maps `instructionsId` → instruction text. Each `.txt` file is imported with `?raw`, which Vite turns into its file contents as a string at build time, and those strings are collected into the `INSTRUCTIONS` object. `InstructionsId` is derived from this object's keys, so it is the single source of truth for which instruction entries exist. This is also the one file to change if you later move instructions to `public/` (lazy fetch) or a database.

**`gameSpecs/*.txt`**
The raw playing instructions, one plain-text file per game. These are the actual content — the "facts" — written by you, imported by `instructions.ts`. Migrating to Markdown later is just a `.md` extension plus a renderer; the rest of the app is unaffected.

---

### `src/domain/` — the rules

This folder is pure logic. No buttons, no colors, no React. Just data in, data out. That makes it easy to test and easy to reuse.

**`types.ts`**
The definitions of the shapes: what a `Game` is, what a `Preferences` object is, what a `DimensionId` is, what an `InstructionsId` is. These types are the contract every other file agrees on. If the shape of a game changes, it changes here, and the compiler points at everything that needs updating.

**`recommend.ts`**
The brain. Contains the distance math and the `recommend(prefs, games)` function: it takes the user's preferences and the list of games, computes Euclidean distance over only the set dimensions, and returns the games ranked best-to-worst. Because it's a plain function over plain data, you can call it from anywhere and test it without a browser.

**`recommend.test.ts`**
Automated tests for `recommend.ts`. It checks things like: does leaving a dimension unset correctly ignore it, is the ranking in the right order, are ties broken by processing order, does zero preferences return an empty list. You run it with a command; it tells you pass/fail so you don't silently break the math later.

---

### `src/components/` — the visuals

Each file is a React component: a reusable chunk of screen. They receive data as inputs ("props") and draw UI. They contain _no_ recommendation logic — they just display what they're given and report user actions upward.

**`RegistryList.tsx`**
Draws the plain list of every game in the registry, with its dimension values, and a "Game instructions" button per row. The "browse the shelf" half of the app.

**`PreferenceControls.tsx`**
Draws one control per dimension (the N/A-plus-0–10 slider setup). When the user moves a slider, it reports the new preference upward to `App.tsx`. It also handles the "unset / N/A" state.

**`RecommendationList.tsx`**
Draws the ranked results — each game's name with its dimension values alongside, in the order `recommend` returned them, plus a "Game instructions" button per row. The "picked for you" half of the app.

**`InstructionsModal.tsx`**
The popup that shows a game's instruction text. Receives the text as a prop and displays it with line breaks preserved. Closes on Escape / backdrop / close button. Knows nothing about where the text came from, so it works the same whether instructions are bundled, fetched, or loaded from a database later.

---

### How they connect (one sentence each)

`index.html` loads `main.tsx`, which renders `App.tsx`; `App.tsx` gets the facts from `data/`, holds the user's preferences and which instructions popup is open, and passes preferences to `domain/recommend.ts` when the button is pressed; the `components/` draw the registry, the sliders, the results, and the instructions modal. Config files (`package.json`, `tsconfig.json`, `vite.config.ts`, `vercel.json`) sit outside all of this and just tell the tooling how to build and ship it.

### Why split it this way

- **Change the games** → edit `data/games.ts` only.
- **Add a dimension** → edit `data/dimensions.ts` only (compiler finds the gaps).
- **Edit a game's instructions** → edit its `.txt` in `data/gameSpecs/` only.
- **Add a game's instructions** → add the `.txt`, add one import/entry in `data/instructions.ts` (compiler then requires the `instructionsId` on the game).
- **Change how ranking works** → edit `domain/recommend.ts` only.
- **Redesign the UI** → edit `components/` only.
- **Move games to a database** → edit `data/games.ts` only.
- **Move instructions off the bundle** → edit `data/instructions.ts` only.

Each kind of change touches one folder, because facts, rules, and visuals are kept apart. That's the scalability the design is buying you.

**Data input points for future edits:** swapping in the real dimensions requires editing only `data/dimensions.ts`; swapping in the real game list requires editing only `data/games.ts`; real instructions require adding `.txt` files to `data/gameSpecs/` and one entry each in `data/instructions.ts`. No other files need changes.

**Testing:** Vitest covers the pure recommendation logic (distance correctness, omission of unset dimensions, ranking order, tiebreak by processing order, empty-preferences case).

**Deployment:** static build to Vercel.

---

## 8. Open Items

Pending input from the group (not blocking the scaffold, which will use placeholders):

1. **Final dimension keys and human-readable labels** — placeholder keys currently `players`, `energy`, `divisiveness`.
2. **Final game list** with values 0–10 for every dimension.
3. **Final playing instructions** — one text file per game.

---

## 9. Summary of Agreed Decisions

| Decision               | Choice                                                                 |
| ---------------------- | ---------------------------------------------------------------------- |
| Stack                  | TypeScript + React + Vite, static SPA on Vercel                        |
| Code style             | Plain types + pure functions (not OOP)                                 |
| Dimension scale        | Integers 0–10                                                          |
| Missing game dimension | Prevented at compile time via `Record<DimensionId, number>`            |
| Player count           | A dimension, not a separate field                                      |
| Unset preference       | Key absent from `Preferences`; N/A shown left of 0                     |
| Recommend trigger      | Disabled until ≥1 dimension set                                        |
| Results                | Full ranked list, no K cutoff; name + dimensions per row               |
| Distance               | Euclidean over active dimensions only; equal weights, no normalization |
| Ties                   | Broken by processing order                                             |
| Registry list v1       | Static, no filter/sort                                                 |
| Persistence            | None (stateless)                                                       |
| Game storage           | Hardcoded array, isolated for future DB/API swap                       |
| Instructions storage   | One `.txt` per game in `data/gameSpecs/`, imported `?raw` (bundled)    |
| Instructions reference | `Game.instructionsId` is a stable key into `INSTRUCTIONS`, not a path  |
| Instructions link      | Compile-checked via `InstructionsId = keyof typeof INSTRUCTIONS`       |
| Instructions UI        | "Game instructions" button per row opens an `InstructionsModal`        |
| UI                     | Plain in v1; presentation layer kept separate for future redesign      |
