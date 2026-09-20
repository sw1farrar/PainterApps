import { cn } from "@/lib/utils";
import { bandForScore, scoreColor } from "@/lib/paintday/score";

export function ScoreRing({
  score,
  size = 180,
  label,
  summary,
}: {
  score: number;
  size?: number;
  label?: string;
  summary?: string;
}) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = scoreColor(score);
  const band = bandForScore(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 128 128"
        className="drop-shadow-sm"
        role="img"
        aria-label={`${label ?? "Score"} ${score}`}
      >
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-muted/60"
          strokeWidth="10"
        />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 64 64)"
          style={{ transition: "stroke-dashoffset 700ms ease" }}
        />
        <text
          x="64"
          y="70"
          textAnchor="middle"
          className="score-numeral fill-foreground"
          style={{ fontSize: "36px", fontWeight: 650 }}
        >
          {score}
        </text>
      </svg>
      {summary ? (
        <p className="text-center text-sm font-medium">{summary}</p>
      ) : null}
      <p
        className={cn(
          "text-xs uppercase tracking-[0.18em] text-muted-foreground",
        )}
      >
        {band.replaceAll("-", " ")}
      </p>
    </div>
  );
}
