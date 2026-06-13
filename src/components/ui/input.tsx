"use client";

import * as React from "react";

import {
  getPasswordManagerIgnoreProps,
  isCredentialFieldType,
  sanitizeCredentialFieldId,
  sanitizeCredentialFieldName,
} from "@/lib/forms/password-manager";
import { useSuppressPasswordManager } from "@/providers/PasswordManagerProvider";
import { cn } from "@/lib/utils";

export type InputProps = React.ComponentProps<"input"> & {
  allowPasswordManager?: boolean;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      allowPasswordManager = false,
      autoComplete: autoCompleteProp,
      readOnly,
      onFocus,
      onMouseDown,
      onTouchStart,
      name,
      id,
      inputMode,
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

    const effectiveType =
      shouldSuppress && isCredentialFieldType(type) ? "text" : type;
    const effectiveInputMode =
      shouldSuppress && type === "email"
        ? "email"
        : shouldSuppress && type === "password"
          ? "text"
          : inputMode;
    const effectiveName = shouldSuppress
      ? sanitizeCredentialFieldName(name)
      : name;
    const effectiveId = shouldSuppress ? sanitizeCredentialFieldId(id) : id;

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      unlockField();
      onFocus?.(event);
    };

    const handleMouseDown = (event: React.MouseEvent<HTMLInputElement>) => {
      unlockField();
      onMouseDown?.(event);
    };

    const handleTouchStart = (event: React.TouchEvent<HTMLInputElement>) => {
      unlockField();
      onTouchStart?.(event);
    };

    return (
      <input
        type={effectiveType}
        id={effectiveId}
        name={effectiveName}
        inputMode={effectiveInputMode}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
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
Input.displayName = "Input";

export { Input };