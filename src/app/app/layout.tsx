import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { currentUserId } from "@/lib/auth/current-user";
import { isNewsEditor } from "@/lib/news/editors";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("nav");
  const { currentAccess } = await import("@/lib/auth/access");
  const access = await currentAccess();
  if (access && !access.accessEnabled) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    await supabase?.auth.signOut();
    const { redirect } = await import("next/navigation");
    redirect("/login?error=disabled");
  }
  const editor = await isNewsEditor(await currentUserId());
  const links = [
    { href: "/app", label: t("dashboard") },
    { href: "/app/estimates", label: t("estimates") },
    { href: "/app/jobs", label: t("jobs") },
    { href: "/app/customers", label: t("customers") },
    { href: "/app/locations", label: t("locations") },
    { href: "/app/settings", label: t("settings") },
    ...(access?.isOwner ? [{ href: "/app/team", label: t("team") }] : []),
    ...(access?.isPlatformAdmin ? [{ href: "/app/admin", label: t("admin") }] : []),
    ...(editor ? [{ href: "/app/news", label: t("write") }] : []),
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
