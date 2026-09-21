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

    function update() {
      const marker = 120;
      let current = sections[0]?.id ?? "";
      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - marker <= 0) {
          current = section.id;
        }
      }
      if (current) setActive(current);
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("hashchange", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("hashchange", update);
    };
  }, [sections]);

  return (
    <nav className="sticky top-14 z-20 -mx-4 mb-6 flex flex-wrap gap-1 border-b border-border bg-background/90 px-4 py-2 backdrop-blur">
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          onClick={() => setActive(s.id)}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm",
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
