import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("h-8 w-8", className)}
    >
      <rect width="32" height="32" rx="8" className="fill-foreground" />
      <path
        d="M8 22c4-9 7-13 10-13 2 0 3 1.4 3 3.2 0 3.4-3.2 5.3-6.2 5.3H13"
        fill="none"
        stroke="url(#pa-stroke)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 22h11"
        fill="none"
        stroke="url(#pa-stroke)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="pa-stroke" x1="8" y1="9" x2="24" y2="22">
          <stop offset="0" stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#34d399" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({
  className,
  wordmark = true,
}: {
  className?: string;
  wordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      {wordmark ? (
        <span className="text-base font-semibold tracking-tight">
          PainterApps
        </span>
      ) : null}
    </span>
  );
}
