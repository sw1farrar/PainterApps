"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/providers/ThemeProvider";
import { cn } from "@/lib/utils";

type ThemeToggleButtonProps = {
  className?: string;
};

export function ThemeToggleButton({ className }: ThemeToggleButtonProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-3 py-3 text-left text-base font-semibold text-foreground transition hover:bg-accent",
        className,
      )}
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
}