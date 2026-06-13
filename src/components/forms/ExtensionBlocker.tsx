"use client";

import * as React from "react";

import { EXTENSION_UI_SELECTORS } from "@/lib/forms/password-manager";

type ExtensionBlockerProps = {
  active: boolean;
  children: React.ReactNode;
};

function removeExtensionUi() {
  document.querySelectorAll(EXTENSION_UI_SELECTORS).forEach((node) => {
    node.remove();
  });
}

export function ExtensionBlocker({ active, children }: ExtensionBlockerProps) {
  React.useEffect(() => {
    if (!active) return;

    removeExtensionUi();

    const observer = new MutationObserver(() => {
      removeExtensionUi();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-lastpass-icon-root", "class", "id"],
    });

    const interval = window.setInterval(removeExtensionUi, 400);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, [active]);

  return <>{children}</>;
}