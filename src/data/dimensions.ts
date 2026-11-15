export const DIMENSIONS = [
    "minPlayers",
    "maxPlayers",
    "energy",
    "divisiveness",
] as const;

export type DimensionId = (typeof DIMENSIONS)[number];

export const DIMENSION_META: Record<DimensionId, { label: string }> = {
    minPlayers: { label: "Min number of players" },
    maxPlayers: { label: "Max number of players" },
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
