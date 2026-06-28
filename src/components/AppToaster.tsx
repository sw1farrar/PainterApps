"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      theme="dark"
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