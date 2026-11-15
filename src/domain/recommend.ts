import type { DimensionId } from "../data/dimensions";
import type { Game, Preferences } from "./types";

function euclidean(
    prefs: Preferences,
    game: Game,
    active: DimensionId[],
): number {
    let sumSquares = 0;
    for (const d of active) {
        const diff = prefs[d]! - game.dimensions[d];
        sumSquares += diff * diff;
    }
    return Math.sqrt(sumSquares);
}

export function recommend(prefs: Preferences, games: Game[]): Game[] {
    const active = (Object.keys(prefs) as DimensionId[]).filter(
        (d) => prefs[d] !== undefined,
    );
    if (active.length === 0) return [];

    return games
        .map((g, i) => ({ g, i, d: euclidean(prefs, g, active) }))
        .sort((a, b) => a.d - b.d || a.i - b.i)
        .map(({ g }) => g);
}
