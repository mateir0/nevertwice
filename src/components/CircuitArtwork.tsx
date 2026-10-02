interface CircuitArtworkProps {
  /** Visual weight of the schematic layer. Hero uses 0.1, lower sections 0.05. */
  opacity?: number;
  className?: string;
}

/**
 * Faint bronze schematic traces — wiring-diagram ambience for the dossier.
 * Purely atmospheric: absolutely positioned, non-interactive, aria-hidden.
 * The parent must be positioned and its content raised above this layer.
 */
export function CircuitArtwork({ opacity = 0.1, className }: CircuitArtworkProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
      viewBox="0 0 1440 700"
      preserveAspectRatio="xMidYMid slice"
    >
      <g opacity={opacity} stroke="#A67C3D" strokeWidth={1.5} fill="none">
        <path d="M-20,150 H220 V300 H520" />
        <path d="M1460,120 H1240 V260 H1020" />
        <path d="M-20,480 H340 V600 H700" />
        <path d="M1460,520 H1180 V420 H980" />
        <path d="M640,-20 V140 H860" />
        <path d="M700,720 V580 H480" />
      </g>
      <g opacity={opacity} fill="#A67C3D">
        <circle cx="220" cy="300" r="4" />
        <circle cx="1240" cy="260" r="4" />
        <circle cx="340" cy="600" r="4" />
        <circle cx="1180" cy="420" r="4" />
        <circle cx="860" cy="140" r="4" />
        <circle cx="480" cy="580" r="4" />
      </g>
      <rect
        x="1050"
        y="180"
        width="260"
        height="180"
        stroke="#A67C3D"
        strokeWidth={1.25}
        fill="none"
        opacity={opacity}
        strokeDasharray="10 6"
      />
    </svg>
  );
}
