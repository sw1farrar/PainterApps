export function EmptyMapIllustration() {
  return (
    <svg viewBox="0 0 240 140" className="mx-auto h-28 w-auto text-muted-foreground" aria-hidden>
      <rect x="8" y="16" width="224" height="108" rx="16" fill="currentColor" opacity="0.08" />
      <path
        d="M40 90c20-28 36-40 52-40 12 0 18 10 28 10 14 0 22-18 40-18 20 0 32 22 40 38"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.4"
      />
      <circle cx="92" cy="52" r="5" className="fill-primary" />
      <circle cx="160" cy="42" r="5" className="fill-primary" opacity="0.7" />
    </svg>
  );
}

export function EmptyBoxIllustration() {
  return (
    <svg viewBox="0 0 160 120" className="mx-auto h-24 w-auto text-muted-foreground" aria-hidden>
      <rect x="30" y="28" width="100" height="70" rx="12" fill="currentColor" opacity="0.08" />
      <path
        d="M50 70h60M50 82h36"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.35"
      />
      <circle cx="80" cy="48" r="10" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.5" />
    </svg>
  );
}
