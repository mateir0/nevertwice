interface CircuitArtworkProps {
  /** Visual weight of the engraved layer. Hero uses 0.07, lower sections 0.05. */
  opacity?: number;
  className?: string;
}

/**
 * Engraved circuit watermark — copper traces, brass chip outline, via nodes.
 * Purely atmospheric: absolutely positioned, non-interactive, aria-hidden.
 * The parent must be positioned and its content raised above this layer.
 */
export function CircuitArtwork({ opacity = 0.07, className }: CircuitArtworkProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
      viewBox="0 0 1440 700"
      preserveAspectRatio="xMidYMid slice"
    >
      <g opacity={opacity} stroke="#B87333" strokeWidth={2} fill="none">
        <path d="M-20,150 H220 V300 H520" />
        <path d="M1460,120 H1240 V260 H1020" />
        <path d="M-20,480 H340 V600 H700" />
        <path d="M1460,520 H1180 V420 H980" />
      </g>
      <g opacity={opacity} fill="#B87333">
        <circle cx="220" cy="300" r="5" />
        <circle cx="1240" cy="260" r="5" />
        <circle cx="340" cy="600" r="5" />
        <circle cx="1180" cy="420" r="5" />
        <circle cx="720" cy="150" r="4" />
        <circle cx="880" cy="560" r="4" />
      </g>
      <rect
        x="1050"
        y="180"
        width="260"
        height="180"
        stroke="#B5A642"
        strokeWidth={1.5}
        fill="none"
        opacity={opacity}
      />
    </svg>
  );
}
