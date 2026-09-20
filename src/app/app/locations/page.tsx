import { getTranslations } from "next-intl/server";
import { EmptyBoxIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { currentUserId } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { deleteLocation, saveLocation } from "./actions";

export const metadata = { title: "Locations" };

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ zip?: string }>;
}) {
  const { zip } = await searchParams;
  const t = await getTranslations("app");
  const userId = await currentUserId();
  const supabase = await createClient();
  const { data } =
    userId && supabase
      ? await supabase
          .from("locations")
          .select("id,label,zip,is_default")
          .order("created_at", { ascending: false })
      : { data: [] };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("locationsTitle")}
      </h1>
      <form action={saveLocation} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Input name="label" placeholder={t("label")} />
        <Input name="zip" defaultValue={zip ?? ""} placeholder={t("zip")} required />
        <Button type="submit">{t("addLocation")}</Button>
      </form>
      {!data?.length ? (
        <div className="mt-10 text-center">
          <EmptyBoxIllustration />
          <p className="mt-3 text-sm text-muted-foreground">
            {t("locationsEmpty")}
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-xl border border-border">
          {data.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <span>
                {row.label}{" "}
                <span className="text-muted-foreground">{row.zip}</span>
              </span>
              <form
                action={async () => {
                  "use server";
                  await deleteLocation(row.id);
                }}
              >
                <Button type="submit" variant="ghost" size="sm">
                  {t("delete")}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
