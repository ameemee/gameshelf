import type { Game } from "../domain/types";

// the actual games on the shelf >:)
// organized this way to make it easy to transfer into a DB later on. maybe
export const GAMES: Game[] = [
  {
    id: "geoGessur",
    name: "geoGessur",
    dimensions: {
      minPlayers: 1,
      maxPlayers: Infinity,
      energy: 2,
      divisiveness: 2,
    },
    instructionsId: "geoGessur",
  },
];
