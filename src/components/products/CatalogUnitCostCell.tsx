"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  formatMoneyInputOnBlur,
  parseMoneyInput,
  toMoneyInputString,
} from "@/lib/utils";
import { cn } from "@/lib/utils";

type CatalogUnitCostCellProps = {
  productId: string;
  unitCost: number;
  disabled?: boolean;
  isSaving?: boolean;
  inputRef?: (element: HTMLInputElement | null) => void;
  onDraftChange?: (productId: string, value: string | null) => void;
  onSave: (productId: string, unitCost: number) => Promise<boolean>;
  onTabNext?: () => void;
  onTabPrevious?: () => void;
};

export function CatalogUnitCostCell({
  productId,
  unitCost,
  disabled = false,
  isSaving = false,
  inputRef,
  onDraftChange,
  onSave,
  onTabNext,
  onTabPrevious,
}: CatalogUnitCostCellProps) {
  const [value, setValue] = useState(() => toMoneyInputString(unitCost));
  const skipBlurSaveRef = useRef(false);
  const localInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setValue(toMoneyInputString(unitCost));
  }, [unitCost, productId]);

  const assignRef = (element: HTMLInputElement | null) => {
    localInputRef.current = element;
    inputRef?.(element);
  };

  const commit = async () => {
    const formatted = formatMoneyInputOnBlur(value);
    setValue(formatted);
    onDraftChange?.(productId, null);

    const parsed = parseMoneyInput(formatted);
    if (parsed === unitCost) return true;

    return onSave(productId, parsed);
  };

  return (
    <div
      className="relative flex items-center"
      onClick={(event) => event.stopPropagation()}
    >
      <Input
        ref={assignRef}
        type="text"
        inputMode="decimal"
        disabled={disabled || isSaving}
        aria-label="Unit cost"
        className={cn(
          "h-8 w-[6.5rem] border-transparent bg-transparent px-2 text-sm shadow-none",
          "hover:border-border/60 focus:border-input focus:bg-background",
        )}
        value={value}
        onClick={(event) => {
          event.stopPropagation();
          event.currentTarget.select();
        }}
        onFocus={(event) => {
          event.stopPropagation();
          event.currentTarget.select();
          onDraftChange?.(productId, value);
        }}
        onChange={(event) => {
          const next = event.target.value;
          setValue(next);
          onDraftChange?.(productId, next);
        }}
        onBlur={() => {
          if (skipBlurSaveRef.current) {
            skipBlurSaveRef.current = false;
            return;
          }
          void commit();
        }}
        onKeyDown={(event) => {
          if (event.key === "Tab") {
            event.preventDefault();
            skipBlurSaveRef.current = true;
            void commit().finally(() => {
              if (event.shiftKey) {
                onTabPrevious?.();
              } else {
                onTabNext?.();
              }
            });
            return;
          }

          if (event.key === "Enter") {
            event.preventDefault();
            skipBlurSaveRef.current = true;
            void commit().finally(() => {
              if (event.shiftKey) {
                onTabPrevious?.();
              } else {
                onTabNext?.();
              }
            });
            return;
          }

          if (event.key === "Escape") {
            event.preventDefault();
            setValue(toMoneyInputString(unitCost));
            onDraftChange?.(productId, null);
            event.currentTarget.blur();
          }
        }}
      />
      {isSaving ? (
        <Loader2 className="absolute -right-1 h-3.5 w-3.5 animate-spin text-muted-foreground" />
      ) : null}
    </div>
  );
}

export function focusCatalogUnitCostInput(input: HTMLInputElement | null | undefined) {
  if (!input) return;
  input.focus();
  input.select();
}