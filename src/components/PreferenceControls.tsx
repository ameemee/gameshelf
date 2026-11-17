import { DIMENSIONS, DIMENSION_META } from "../data/dimensions";
import type { Preferences } from "../domain/types";

interface PreferenceControlsProps {
    prefs: Preferences;
    onChange: (next: Preferences) => void;
}

export function PreferenceControls({
    prefs,
    onChange,
}: PreferenceControlsProps) {
    function setDimension(
        dim: keyof Preferences["dimensions"],
        value: number | undefined,
    ) {
        const nextDimensions = { ...prefs.dimensions };
        if (value === undefined) {
            delete nextDimensions[dim];
        } else {
            nextDimensions[dim] = value;
        }
        onChange({ ...prefs, dimensions: nextDimensions });
    }

    function setPlayerCount(value: number | undefined) {
        onChange({ ...prefs, playerCount: value });
    }

    return (
        <section className="preference-controls">
            <h2>Preferences</h2>
            {DIMENSIONS.map((dim) => {
                const value = prefs.dimensions[dim];
                return (
                    <div key={dim} className="dimension-control">
                        <label>
                            <input
                                type="checkbox"
                                checked={value !== undefined}
                                onChange={(e) =>
                                    setDimension(
                                        dim,
                                        e.target.checked ? 5 : undefined,
                                    )
                                }
                            />
                            {DIMENSION_META[dim].label}
                        </label>
                        <input
                            type="range"
                            min={0}
                            max={10}
                            step={1}
                            value={value ?? 5}
                            disabled={value === undefined}
                            onChange={(e) =>
                                setDimension(dim, Number(e.target.value))
                            }
                        />
                        <span>{value === undefined ? "N/A" : value}</span>
                    </div>
                );
            })}
            <div className="player-count-control">
                <label>
                    Number of players
                    <input
                        type="number"
                        min={1}
                        value={prefs.playerCount ?? ""}
                        onChange={(e) =>
                            setPlayerCount(
                                e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value),
                            )
                        }
                    />
                </label>
            </div>
        </section>
    );
}
