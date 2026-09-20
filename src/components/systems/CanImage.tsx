import { cn } from "@/lib/utils";

function CanSilhouette({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 80"
      className={cn("h-full w-full", className)}
      aria-hidden
    >
      <ellipse cx="32" cy="74" rx="16" ry="3" className="fill-foreground/10" />
      <path
        d="M18 22h28l2 46c0 3-6 6-16 6s-16-3-16-6z"
        className="fill-muted-foreground/25"
      />
      <path
        d="M20 24h24l1.6 42c0 2.2-5 4.4-13.6 4.4S18.8 68.2 18.8 66z"
        className="fill-muted"
      />
      <rect
        x="18"
        y="18"
        width="28"
        height="7"
        rx="1.5"
        className="fill-muted-foreground/40"
      />
      <ellipse cx="32" cy="18" rx="14" ry="3.2" className="fill-muted-foreground/50" />
      <path
        d="M22 18c0-8 4.5-14 10-14s10 6 10 14"
        fill="none"
        className="stroke-muted-foreground/55"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="24"
        y="36"
        width="16"
        height="10"
        rx="1"
        className="fill-[oklch(0.62_0.16_175)]/70"
      />
    </svg>
  );
}

export function CanImage({
  src,
  alt,
  size = "md",
  className,
}: {
  src?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const box =
    size === "lg"
      ? "h-[6.5rem] w-[5.25rem]"
      : size === "sm"
        ? "h-12 w-10"
        : "h-[4.25rem] w-14";
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-end justify-center",
        box,
        className,
      )}
    >
      <span className="pointer-events-none absolute inset-x-2 bottom-0 h-1.5 rounded-full bg-foreground/15 blur-[1px]" />
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="relative z-[1] h-full w-full object-contain object-bottom drop-shadow-[0_8px_12px_rgba(0,0,0,0.28)]"
        />
      ) : (
        <span className="relative z-[1] h-full w-full">
          <CanSilhouette />
          <span className="sr-only">{alt}</span>
        </span>
      )}
    </span>
  );
}
