"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function SettingsNav({
  sections,
}: {
  sections: Array<{ id: string; label: string }>;
}) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash && sections.some((s) => s.id === hash)) setActive(hash);
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!els.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0.2, 0.5, 1] },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className="sticky top-14 z-20 -mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-border bg-background/90 px-4 py-2 backdrop-blur">
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          onClick={() => setActive(s.id)}
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 text-sm",
            active === s.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {s.label}
        </a>
      ))}
    </nav>
  );
}
