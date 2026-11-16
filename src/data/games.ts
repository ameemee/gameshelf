import type { Game } from "../domain/types";

// the actual games on the shelf >:)
// organized this way to make it easy to transfer into a DB later on. maybe
export const GAMES: Game[] = [
    {
        id: "geoGessur",
        name: "geoGessur",
        dimensions: {
            energy: 2,
            divisiveness: 2,
        },
        playerRange: { min: 1, max: Infinity },
        instructionsId: "geoGessur",
    },
    {
        id: "codenames",
        name: "Codenames",
        dimensions: { energy: 2, divisiveness: 5 },
        playerRange: { min: 4, max: 8 },
        instructionsId: "codenames",
    },
];
