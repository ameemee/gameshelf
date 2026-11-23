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
                    <li key={game.id} className="game-row">
                        <div className="game-row-main">
                            <span className="game-name">
                                {index + 1}. {game.name}
                            </span>
                            <span className="game-meta">
                                {Object.entries(game.dimensions).map(
                                    ([dim, value]) => (
                                        <span
                                            key={dim}
                                            className="dimension-value"
                                        >
                                            {dim}: {value}
                                        </span>
                                    ),
                                )}
                            </span>
                        </div>
                        <button
                            type="button"
                            className="btn btn-secondary"
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
