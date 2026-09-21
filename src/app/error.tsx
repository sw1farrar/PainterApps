"use client";

import { Button } from "@/components/ui/button";
import { EmptyBoxIllustration } from "@/components/illustrations";

export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <EmptyBoxIllustration />
      <h1 className="mt-6 text-2xl font-semibold">Something broke</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Something broke on our side. Try again.
      </p>
      <Button className="mt-6" onClick={reset}>
        Retry
      </Button>
    </div>
  );
}
