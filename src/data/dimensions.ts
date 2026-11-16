// these are the dimensions that participate in the euclidean distance ranking
// note: player count is NOT a dimension - it's a filter (Game.playerRange vs. Preferences.playerCount)
// that's applied before ranking occurs
export const DIMENSIONS = ["energy", "divisiveness"] as const;

export type DimensionId = (typeof DIMENSIONS)[number];

export const DIMENSION_META: Record<DimensionId, { label: string }> = {
    energy: { label: "Energy required" },
    divisiveness: { label: "Divisiveness" },
};

/* 
syntax notes:
- as const: 
a compile-time type assertion ("const assertion"). instructs the compiler to infer the narrowest, most specific literal type possible for a value and marks objects and arrays as deeply read-only

- (typeof DIMENSIONS)[number]:
extracts the union of the tuple's element types: "players" | "energy" | "divisiveness". this is the trick that makes "add a dimension = one line in the tuple" true, because everything downstream references DimensionId, not the literal union.

- Record<Keys, Type>: 
ts utility type that constructs an object type with a fixed set of keys, where every key maps to the same value type.



*/
