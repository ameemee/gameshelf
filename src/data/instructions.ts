// note: the "?raw" is a vite feature telling the bundler: "don't treat this as a module. read the file's contents as a string, and make the default export of this import be that string."
import geoGessurInstructions from "./gameSpecs/geoGessur.txt";
import codenamesInstructions from "./gameSpecs/codenames.txt";

// INSTRUCTIONS is stored going to be pulled when rendering the game.
// chose to store each in it's own file instead of as a string since it can get long
export const INSTRUCTIONS = {
    geoGessur: geoGessurInstructions,
    codenames: codenamesInstructions,
} as const;

export type InstructionsId = keyof typeof INSTRUCTIONS;
