import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { HomeMapBoard } from "@/components/paintday/HomeMapBoard";
import { getMapBoard } from "@/lib/paintday/map-scores";

export default async function HomePage() {
  const t = await getTranslations();
  const board = await getMapBoard();

  return (
    <div>
      <section className="border-b border-border bg-card/40 py-12">
        <div className="mx-auto max-w-6xl px-4">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {t("landing.mapTitle")}
          </h1>
          <div className="mt-6">
            <HomeMapBoard board={board} />
          </div>
        </div>
      </section>

      <section className="border-t border-border py-10">
        <div className="mx-auto grid max-w-6xl gap-3 px-4 sm:grid-cols-3">
          <ToolLink
            href="/systems"
            kicker={t("nav.systems")}
            title={t("landing.systemsTitle")}
            body={t("landing.systemsPeek")}
          />
          <ToolLink
            href="/calc"
            kicker={t("nav.calc")}
            title={t("landing.calcTitle")}
            body={t("landing.calcPeek")}
          />
          <ToolLink
            href="/about"
            kicker={t("nav.about")}
            title={t("landing.aboutPeekTitle")}
            body={t("landing.aboutPeek")}
          />
        </div>
      </section>
    </div>
  );
}

function ToolLink({
  href,
  kicker,
  title,
  body,
}: {
  href: string;
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40"
    >
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {kicker}
      </p>
      <p className="mt-2 font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </Link>
  );
}
