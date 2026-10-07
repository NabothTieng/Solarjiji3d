interface FullscreenToggleProps {
  isFullscreen: boolean;
  onToggle: () => void;
}

export function FullscreenToggle({
  isFullscreen,
  onToggle,
}: FullscreenToggleProps) {
  return (
    <button
      onClick={onToggle}
      title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      style={{
        background: "none",
        border: "none",
        color: "#fff",
        cursor: "pointer",
        padding: 2,
        display: "flex",
        alignItems: "center",
      }}
    >
      {isFullscreen ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M5 1H1V5" />
          <path d="M11 1H15V5" />
          <path d="M5 15H1V11" />
          <path d="M11 15H15V11" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M1 5V1H5" />
          <path d="M15 5V1H11" />
          <path d="M1 11V15H5" />
          <path d="M15 11V15H11" />
        </svg>
      )}
    </button>
  );
}
