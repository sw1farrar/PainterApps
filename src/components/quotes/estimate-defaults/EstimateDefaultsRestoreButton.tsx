"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type EstimateDefaultsRestoreButtonProps = {
  disabled?: boolean;
  onClick: () => void;
};

export function EstimateDefaultsRestoreButton({
  disabled = false,
  onClick,
}: EstimateDefaultsRestoreButtonProps) {
  return (
    <Button
      type="button"
      variant={disabled ? "secondary" : "outline"}
      size="sm"
      className="shrink-0"
      disabled={disabled}
      onClick={onClick}
    >
      <RotateCcw className="h-3.5 w-3.5" />
      Restore defaults
    </Button>
  );
}