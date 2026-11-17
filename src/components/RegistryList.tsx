import type { Game } from "../domain/types";

interface RegistryListProps {
    games: Game[];
    onShowInstructions: (gameId: string) => void;
}

export function RegistryList({ games, onShowInstructions }: RegistryListProps) {
    return (
        <section className="registry-list">
            <h2>All games</h2>
            <ul>
                {games.map((game) => (
                    <li key={game.id} className="game-row">
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
                        <span className="game-players">
                            {game.playerRange.min}–{game.playerRange.max}{" "}
                            players
                        </span>
                        <button
                            type="button"
                            onClick={() => onShowInstructions(game.id)}
                        >
                            Game instructions
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
}
