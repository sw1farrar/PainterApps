export function scrollSiteMainToTop(behavior: ScrollBehavior = "smooth") {
  const main = document.querySelector<HTMLElement>("[data-site-scroll-main]");
  if (main) {
    main.scrollTo({ top: 0, behavior });
    return;
  }

  window.scrollTo({ top: 0, behavior });
}