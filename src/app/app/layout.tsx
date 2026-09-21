import { getTranslations } from "next-intl/server";
import { AppNav } from "@/components/layout/AppNav";
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
  const editor = await isNewsEditor(access?.userId ?? (await currentUserId()));
  const estimatePro = Boolean(access?.features.estimate_pro);
  const links = [
    { href: "/app", label: t("dashboard") },
    ...(estimatePro
      ? [
          { href: "/app/estimates", label: t("estimates") },
          { href: "/app/jobs", label: t("jobs") },
          { href: "/app/customers", label: t("customers") },
        ]
      : []),
    { href: "/app/settings", label: t("settings") },
    ...(estimatePro && access?.isOwner
      ? [{ href: "/app/team", label: t("team") }]
      : []),
    ...(access?.isPlatformAdmin ? [{ href: "/app/admin", label: t("admin") }] : []),
    ...(access?.isPlatformAdmin || editor
      ? [{ href: "/app/catalog", label: t("catalog") }]
      : []),
    ...(editor ? [{ href: "/app/news", label: t("write") }] : []),
  ];
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col md:flex-row">
      <aside className="shrink-0 border-b border-border bg-background px-3 py-2 md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)] md:w-48 md:overflow-y-auto md:border-b-0 md:border-r md:py-6">
        <AppNav links={links} />
      </aside>
      <div className="min-w-0 flex-1 px-4 py-6">
        {children}
      </div>
    </div>
  );
}
