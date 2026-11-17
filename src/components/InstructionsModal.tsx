interface InstructionsModalProps {
    gameName: string;
    text: string;
    onClose: () => void;
}

export function InstructionsModal({
    gameName,
    text,
    onClose,
}: InstructionsModalProps) {
    return (
        <dialog open className="instructions-modal" onClose={onClose}>
            <h2>{gameName} — Instructions</h2>
            <pre className="instructions-text">{text}</pre>
            <button type="button" onClick={onClose}>
                Close
            </button>
        </dialog>
    );
}
