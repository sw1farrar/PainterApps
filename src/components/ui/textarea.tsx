"use client";

import * as React from "react";

import { getPasswordManagerIgnoreProps } from "@/lib/forms/password-manager";
import { useSuppressPasswordManager } from "@/providers/PasswordManagerProvider";
import { cn } from "@/lib/utils";

export type TextareaProps = React.ComponentProps<"textarea"> & {
  allowPasswordManager?: boolean;
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      allowPasswordManager = false,
      autoComplete: autoCompleteProp,
      readOnly,
      onFocus,
      onMouseDown,
      onTouchStart,
      ...props
    },
    ref,
  ) => {
    const suppressPasswordManager = useSuppressPasswordManager();
    const shouldSuppress = suppressPasswordManager && !allowPasswordManager;
    const [fieldReady, setFieldReady] = React.useState(!shouldSuppress);

    const unlockField = () => {
      if (shouldSuppress) setFieldReady(true);
    };

    const handleFocus = (event: React.FocusEvent<HTMLTextAreaElement>) => {
      unlockField();
      onFocus?.(event);
    };

    const handleMouseDown = (event: React.MouseEvent<HTMLTextAreaElement>) => {
      unlockField();
      onMouseDown?.(event);
    };

    const handleTouchStart = (event: React.TouchEvent<HTMLTextAreaElement>) => {
      unlockField();
      onTouchStart?.(event);
    };

    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          shouldSuppress && "pm-suppressed-field",
          className,
        )}
        ref={ref}
        readOnly={shouldSuppress && !fieldReady ? true : readOnly}
        onFocus={handleFocus}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        {...props}
        {...(shouldSuppress
          ? getPasswordManagerIgnoreProps()
          : { autoComplete: autoCompleteProp })}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };