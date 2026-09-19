import { getTranslations } from "next-intl/server";
import { EmptyBoxIllustration } from "@/components/illustrations";

export const metadata = { title: "Estimates" };

export default async function EstimatesPage() {
  const t = await getTranslations("app");
  const items = [
    t("estimatesList1"),
    t("estimatesList2"),
    t("estimatesList3"),
    t("estimatesList4"),
  ];
  return (
    <div className="max-w-xl">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
        {t("estimatesKicker")}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {t("estimatesTitle")}
      </h1>
      <div className="mt-8 rounded-2xl border border-dashed border-border p-8">
        <EmptyBoxIllustration />
        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          {t("estimatesBody")}
        </p>
        <ul className="mt-6 space-y-2 text-sm">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs text-muted-foreground">{t("waitlist")}</p>
      </div>
    </div>
  );
}
