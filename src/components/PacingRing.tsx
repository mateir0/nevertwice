"use client";

interface PacingRingProps {
  secondsRemaining: number;
  totalSeconds?: number;
  size?: number;
  strokeWidth?: number;
}

export function PacingRing({
  secondsRemaining,
  totalSeconds = 54,
  size = 72,
  strokeWidth = 6,
}: PacingRingProps) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(totalSeconds, secondsRemaining));
  const progress = totalSeconds > 0 ? clamped / totalSeconds : 0;
  const dashOffset = circumference * (1 - progress);

  const isCritical = clamped <= 5;
  const isWarning = clamped <= 15;
  const stroke = isCritical ? "#CC0000" : isWarning ? "#FFB000" : "#33FF00";

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      role="timer"
      aria-label={`${clamped} seconds remaining`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#333333" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-display tabular-nums"
          style={{ fontSize: size * 0.32, color: stroke }}
        >
          {clamped}s
        </span>
      </div>
    </div>
  );
}
