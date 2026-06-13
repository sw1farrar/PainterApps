"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="portal-shell flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-2xl text-white">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred in the portal."}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}