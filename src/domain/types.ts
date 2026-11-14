import type { DimensionId } from "../data/dimensions";
import type { InstructionsId } from "../data/instructions";

// dimension vector is used to represent individual games user preference selections in space
// used to represent how "close" a game is to the preference
export type DimensionVector = Record<DimensionId, number>;

export interface Game {
  id: string;
  name: string;
  dimensions: DimensionVector;
  instructionsId: InstructionsId;
}

// Partial makes every key optional, as users might not supply every dimension
// handle unsupplied dimensions in recommend by filtering for !== undefined
export type Preferences = Partial<Record<DimensionId, number>>;
