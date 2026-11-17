import type { Game } from "../domain/types";

interface RecommendationListProps {
    games: Game[];
    onShowInstructions: (gameId: string) => void;
}

export function RecommendationList({
    games,
    onShowInstructions,
}: RecommendationListProps) {
    if (games.length === 0) {
        return (
            <p className="recommendation-empty">
                No games match your preferences.
            </p>
        );
    }

    return (
        <section className="recommendation-list">
            <h2>Recommended</h2>
            <ol>
                {games.map((game, index) => (
                    <li key={game.id} className="recommendation-row">
                        <span className="rank">{index + 1}.</span>
                        <span className="game-name">{game.name}</span>
                        <span className="game-dimensions">
                            {Object.entries(game.dimensions).map(
                                ([dim, value]) => (
                                    <span key={dim} className="dimension-value">
                                        {dim}: {value}
                                    </span>
                                ),
                            )}
                        </span>
                        <button
                            type="button"
                            onClick={() => onShowInstructions(game.id)}
                        >
                            Game instructions
                        </button>
                    </li>
                ))}
            </ol>
        </section>
    );
}
