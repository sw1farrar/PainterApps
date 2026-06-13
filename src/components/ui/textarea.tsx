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
    { className, allowPasswordManager = false, autoComplete, ...props },
    ref,
  ) => {
    const suppressPasswordManager = useSuppressPasswordManager();
    const ignoreProps =
      suppressPasswordManager && !allowPasswordManager
        ? getPasswordManagerIgnoreProps(autoComplete)
        : { autoComplete };

    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...ignoreProps}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };