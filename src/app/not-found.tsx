import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EmptyMapIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("empty");
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <EmptyMapIllustration />
      <h1 className="mt-6 text-2xl font-semibold">{t("notFoundTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("notFoundBody")}</p>
      <Button asChild className="mt-6">
        <Link href="/">PainterApps</Link>
      </Button>
    </div>
  );
}
