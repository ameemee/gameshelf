// export default function App() {
//     return <div>{"gameshelf >:)"}</div>;
// }

import { useState } from "react";
import { GAMES } from "./data/games";
import { INSTRUCTIONS } from "./data/instructions";
import { EMPTY_PREFERENCES } from "./domain/types";
import type { Game, Preferences } from "./domain/types";
import { recommend } from "./domain/recommend";
import { RegistryList } from "./components/RegistryList";
import { PreferenceControls } from "./components/PreferenceControls";
import { RecommendationList } from "./components/RecommendationList";
import { InstructionsModal } from "./components/InstructionsModal";

export default function App() {
    const [prefs, setPrefs] = useState<Preferences>(EMPTY_PREFERENCES);
    const [results, setResults] = useState<Game[]>([]);
    const [openInstructionsId, setOpenInstructionsId] = useState<string | null>(
        null,
    );

    const canRecommend =
        Object.keys(prefs.dimensions).length > 0 ||
        prefs.playerCount !== undefined;

    function handleRecommend() {
        setResults(recommend(prefs, GAMES));
    }

    const openGame =
        openInstructionsId === null
            ? null
            : (GAMES.find((g) => g.id === openInstructionsId) ?? null);

    return (
        <main>
            <h1>gameshelf</h1>

            <PreferenceControls prefs={prefs} onChange={setPrefs} />

            <button
                type="button"
                onClick={handleRecommend}
                disabled={!canRecommend}
            >
                Recommend
            </button>

            {results.length > 0 && (
                <RecommendationList
                    games={results}
                    onShowInstructions={setOpenInstructionsId}
                />
            )}

            <RegistryList
                games={GAMES}
                onShowInstructions={setOpenInstructionsId}
            />

            {openGame !== null && (
                <InstructionsModal
                    gameName={openGame.name}
                    text={INSTRUCTIONS[openGame.instructionsId]}
                    onClose={() => setOpenInstructionsId(null)}
                />
            )}
        </main>
    );
}
