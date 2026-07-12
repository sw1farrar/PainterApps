"use client";

import { Moon, Sun } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useTheme } from "@/providers/ThemeProvider";

export function ThemeToggleMenuItem() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <DropdownMenuItem onClick={toggleTheme}>
      {isDark ? (
        <Sun className="mr-2 h-4 w-4" />
      ) : (
        <Moon className="mr-2 h-4 w-4" />
      )}
      {isDark ? "Light mode" : "Dark mode"}
    </DropdownMenuItem>
  );
}