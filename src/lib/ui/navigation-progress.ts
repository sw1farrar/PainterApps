/** Signals the global top navigation progress bar (e.g. router.push without Link). */
export function signalNavigationStart() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("app:navigation-start"));
}