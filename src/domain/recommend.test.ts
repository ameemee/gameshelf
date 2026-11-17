import { describe, expect, it } from "vitest";
import { recommend } from "./recommend";
import type { Game, Preferences } from "./types";

function game(
    id: string,
    dimensions: { energy: number; divisiveness: number },
    playerRange: { min: number; max: number } = { min: 1, max: 8 },
): Game {
    return {
        id,
        name: id,
        dimensions,
        playerRange,
        instructionsId: "codenames",
    };
}

function prefs(
    dimensions: Preferences["dimensions"] = {},
    playerCount?: number,
): Preferences {
    return { dimensions, playerCount };
}

describe("recommend — dimension ranking", () => {
    it("returns an empty list when nothing is set", () => {
        const games = [game("a", { energy: 1, divisiveness: 1 })];
        expect(recommend(prefs(), games)).toEqual([]);
    });

    it("ignores dimensions that are not set", () => {
        const a = game("a", { energy: 5, divisiveness: 10 });
        const b = game("b", { energy: 5, divisiveness: 0 });
        expect(recommend(prefs({ energy: 5 }), [a, b])).toEqual([a, b]);
    });

    it("computes Euclidean distance over the active dimensions", () => {
        const near = game("near", { energy: 5, divisiveness: 0 });
        const far = game("far", { energy: 9, divisiveness: 0 });
        expect(recommend(prefs({ energy: 4 }), [far, near])).toEqual([
            near,
            far,
        ]);
    });

    it("ranks by distance ascending", () => {
        const closer = game("closer", { energy: 5, divisiveness: 5 });
        const farther = game("farther", { energy: 9, divisiveness: 9 });
        expect(
            recommend(prefs({ energy: 5, divisiveness: 5 }), [farther, closer]),
        ).toEqual([closer, farther]);
    });

    it("breaks ties by processing order", () => {
        const first = game("first", { energy: 3, divisiveness: 0 });
        const second = game("second", { energy: 7, divisiveness: 0 });
        expect(recommend(prefs({ energy: 5 }), [first, second])).toEqual([
            first,
            second,
        ]);
        expect(recommend(prefs({ energy: 5 }), [second, first])).toEqual([
            second,
            first,
        ]);
    });

    it("does not mutate the input array", () => {
        const a = game("a", { energy: 1, divisiveness: 1 });
        const b = game("b", { energy: 2, divisiveness: 2 });
        const input = [b, a];
        recommend(prefs({ energy: 1 }), input);
        expect(input[0]).toBe(b);
        expect(input[1]).toBe(a);
    });
});

describe("recommend — player count filter", () => {
    it("does not filter when player count is unset", () => {
        const a = game("a", { energy: 1, divisiveness: 1 }, { min: 2, max: 4 });
        const b = game("b", { energy: 1, divisiveness: 1 }, { min: 5, max: 8 });
        expect(recommend(prefs({ energy: 1 }), [a, b])).toEqual([a, b]);
    });

    it("includes games whose range contains the player count", () => {
        const inRange = game(
            "in",
            { energy: 1, divisiveness: 1 },
            { min: 3, max: 4 },
        );
        const outOfRange = game(
            "out",
            { energy: 1, divisiveness: 1 },
            { min: 5, max: 8 },
        );
        expect(recommend(prefs({}, 4), [inRange, outOfRange])).toEqual([
            inRange,
        ]);
    });

    it("includes a game at the exact min and max boundaries", () => {
        const g = game("g", { energy: 1, divisiveness: 1 }, { min: 3, max: 4 });
        expect(recommend(prefs({}, 3), [g])).toEqual([g]);
        expect(recommend(prefs({}, 4), [g])).toEqual([g]);
    });

    it("excludes games outside the range", () => {
        const g = game("g", { energy: 1, divisiveness: 1 }, { min: 3, max: 4 });
        expect(recommend(prefs({}, 2), [g])).toEqual([]);
        expect(recommend(prefs({}, 5), [g])).toEqual([]);
    });

    it("treats player count alone as a valid query", () => {
        const a = game("a", { energy: 1, divisiveness: 1 }, { min: 2, max: 4 });
        const b = game("b", { energy: 9, divisiveness: 9 }, { min: 2, max: 4 });
        expect(recommend(prefs({}, 3), [a, b])).toEqual([a, b]);
        expect(recommend(prefs({}, 3), [b, a])).toEqual([b, a]);
    });

    it("filters before ranking (ineligible games never appear)", () => {
        // `good` matches preferences perfectly but is ineligible.
        // `bad` matches poorly but is eligible.
        const good = game(
            "good",
            { energy: 5, divisiveness: 5 },
            { min: 6, max: 8 },
        );
        const bad = game(
            "bad",
            { energy: 0, divisiveness: 0 },
            { min: 1, max: 4 },
        );
        expect(
            recommend(prefs({ energy: 5, divisiveness: 5 }, 4), [good, bad]),
        ).toEqual([bad]);
    });

    it("breaks ties by processing order over the eligible subset", () => {
        const ineligible = game(
            "x",
            { energy: 5, divisiveness: 5 },
            { min: 6, max: 8 },
        );
        const eligibleFirst = game(
            "a",
            { energy: 5, divisiveness: 5 },
            { min: 1, max: 4 },
        );
        const eligibleSecond = game(
            "b",
            { energy: 5, divisiveness: 5 },
            { min: 1, max: 4 },
        );
        expect(
            recommend(prefs({ energy: 5 }, 4), [
                ineligible,
                eligibleFirst,
                eligibleSecond,
            ]),
        ).toEqual([eligibleFirst, eligibleSecond]);
    });
});
