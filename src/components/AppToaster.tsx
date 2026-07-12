"use client";

import { Toaster } from "sonner";

import { useTheme } from "@/providers/ThemeProvider";

export function AppToaster() {
  const { theme } = useTheme();

  return (
    <Toaster
      theme={theme}
      position="top-right"
      expand={false}
      richColors
      gap={12}
      offset={{ top: "1rem", right: "1rem" }}
      toastOptions={{
        classNames: {
          toast: "app-toast",
          title: "app-toast-title",
          description: "app-toast-description",
        },
      }}
    />
  );
}