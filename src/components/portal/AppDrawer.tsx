"use client";

import * as React from "react";

import { PASSWORD_MANAGER_SHELL_PROPS } from "@/lib/forms/password-manager";
import { Z_LAYERS } from "@/lib/ui/z-layers";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type AppDrawerSide = "left" | "right" | "top" | "bottom" | "responsive";

export interface AppDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  overlayClassName?: string;
  side?: AppDrawerSide;
}

export function AppDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  overlayClassName,
  side = "responsive",
}: AppDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        overlayClassName={cn(Z_LAYERS.drawerOverlay, overlayClassName)}
        className={cn(
          Z_LAYERS.drawerContent,
          "flex h-[100dvh] w-full flex-col gap-0 rounded-none border-border p-0 md:h-full md:w-[480px] md:max-w-[480px]",
          className,
        )}
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border px-6 py-5 text-left">
          <SheetTitle>{title}</SheetTitle>
          {description ? (
            <SheetDescription>{description}</SheetDescription>
          ) : null}
        </SheetHeader>

        <form
          className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
          onSubmit={(event) => event.preventDefault()}
          {...PASSWORD_MANAGER_SHELL_PROPS}
        >
          {children}
        </form>

        {footer ? (
          <SheetFooter className="shrink-0 border-t border-border px-6 py-4 sm:justify-start">
            {footer}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}