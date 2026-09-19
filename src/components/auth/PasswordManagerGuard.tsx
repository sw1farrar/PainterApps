"use client";

import { useEffect } from "react";

const ALLOW = "[data-allow-password-manager]";

function markForm(form: HTMLFormElement) {
  if (form.closest(ALLOW) || form.matches(ALLOW)) return;
  form.setAttribute("autocomplete", "off");
  form.setAttribute("data-1p-ignore", "true");
  form.setAttribute("data-lpignore", "true");
  form.setAttribute("data-bwignore", "true");
  form.setAttribute("data-form-type", "other");
  form.querySelectorAll("input, select, textarea").forEach((el) => {
    el.setAttribute("data-1p-ignore", "true");
    el.setAttribute("data-lpignore", "true");
    el.setAttribute("data-bwignore", "true");
    el.setAttribute("data-form-type", "other");
    const current = el.getAttribute("autocomplete");
    if (
      !current ||
      current === "on" ||
      current === "email" ||
      current === "username" ||
      current === "current-password" ||
      current === "new-password"
    ) {
      el.setAttribute("autocomplete", "off");
    }
  });
}

export function PasswordManagerGuard({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    const scan = () => {
      document
        .querySelectorAll("form[data-block-password-manager]")
        .forEach((form) => markForm(form as HTMLFormElement));
      if (enabled) {
        document.documentElement.setAttribute("data-password-manager", "off");
        document.querySelectorAll("form").forEach((form) => markForm(form));
      }
    };
    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      document.documentElement.removeAttribute("data-password-manager");
    };
  }, [enabled]);
  return null;
}
