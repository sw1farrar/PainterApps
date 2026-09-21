"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ConfirmDelete({
  action,
  label,
  confirmLabel,
}: {
  action: () => Promise<void>;
  label: string;
  confirmLabel: string;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }
  return (
    <form
      action={async () => {
        await action();
      }}
      className="flex items-center gap-2"
    >
      <Button type="submit" variant="destructive" size="sm">
        {confirmLabel}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        ×
      </Button>
    </form>
  );
}
