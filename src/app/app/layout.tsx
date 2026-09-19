import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("nav");
  const links = [
    { href: "/app", label: t("dashboard") },
    { href: "/app/estimates", label: t("estimates") },
    { href: "/app/jobs", label: t("jobs") },
    { href: "/app/customers", label: t("customers") },
    { href: "/app/locations", label: t("locations") },
    { href: "/app/settings", label: t("settings") },
  ];
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:flex-row">
      <aside className="md:w-48">
        <nav className="flex gap-3 overflow-x-auto text-sm md:flex-col md:gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
