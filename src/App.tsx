// export default function App() {
//     return <div>{"gameshelf >:)"}</div>;
// }
import "./App.css";
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
        <>
            <header className="app-header">
                <h1>gameshelf</h1>
            </header>

            <div className="app-layout">
                <aside className="app-sidebar">
                    <section className="card">
                        <PreferenceControls prefs={prefs} onChange={setPrefs} />
                        <div style={{ marginTop: "var(--space-4)" }}>
                            <button
                                type="button"
                                className="btn btn-primary btn-full"
                                onClick={handleRecommend}
                                disabled={!canRecommend}
                            >
                                Recommend
                            </button>
                        </div>
                    </section>
                </aside>

                <main className="app-main">
                    {results.length > 0 && (
                        <section className="card recommendation-list">
                            <RecommendationList
                                games={results}
                                onShowInstructions={setOpenInstructionsId}
                            />
                        </section>
                    )}

                    <section className="card">
                        <RegistryList
                            games={GAMES}
                            onShowInstructions={setOpenInstructionsId}
                        />
                    </section>
                </main>
            </div>

            {openGame !== null && (
                <InstructionsModal
                    gameName={openGame.name}
                    text={INSTRUCTIONS[openGame.instructionsId]}
                    onClose={() => setOpenInstructionsId(null)}
                />
            )}
        </>
    );
}
