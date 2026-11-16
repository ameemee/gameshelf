import type { DimensionId } from "../data/dimensions";
import type { Game, Preferences } from "./types";

function euclideanDist(
    prefs: Partial<Record<DimensionId, number>>,
    game: Game,
    active: DimensionId[],
): number {
    let sumSquared = 0;

    for (const dim of active) {
        const diff = prefs[dim]! - game.dimensions[dim];
        sumSquared += diff ** 2;
    }

    return Math.sqrt(sumSquared);
}

// returns True if the game can accomodate playerCount people
function isEligible(playerCount: number | undefined, game: Game): boolean {
    if (!playerCount) {
        return true;
    }

    return (
        playerCount >= game.playerRange.min &&
        playerCount <= game.playerRange.max
    );
}

export function recommend(prefs: Preferences, games: Game[]): Game[] {
    // step 0. determine which dimensiosn the player actually supplied a value/pref for
    const allDims = Object.keys(prefs.scalars) as DimensionId[];
    const suppliedDims: DimensionId[] = [];

    for (const dim of allDims) {
        if (prefs.scalars[dim] !== undefined) {
            suppliedDims.push(dim);
        }
    }

    const playerCountSupplied = prefs.playerCount !== undefined;

    // early escape if no preferences were given
    if (suppliedDims.length === 0 && !playerCountSupplied) {
        return [];
    }

    // step 1. keep only games that can accomodate the supplied player count
    const eligileGames = games.filter((game) =>
        isEligible(prefs.playerCount, game),
    );

    // step 2. score each one (euclidean distance) by how close it is to the player's preferences
    const scored = eligileGames.map((game, index) => {
        return {
            game: game,
            index: index,
            distance: euclideanDist(prefs.scalars, game, suppliedDims),
        };
    });

    // step 3. sort them by closest to furthest.
    // tie break by earlier one
    scored.sort((game1, game2) => {
        if (game1.distance !== game2.distance) {
            return game1.distance - game2.distance; // remember: if negative, g1 before g2
        }
        return game1.index - game2.index; // tiebreak by whatever game first in the sorted list
    });

    // step 4. return just the games itself (drop helper info)
    const scoredGames: Game[] = [];

    for (const item of scored) {
        scoredGames.push(item.game);
    }

    return scoredGames;
}
