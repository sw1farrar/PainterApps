import { notFound } from "next/navigation";
import { getLocale, getMessages } from "next-intl/server";
import { ZipForecastBoard } from "@/components/paintday/ZipForecastBoard";
import { ClientIntl } from "@/components/i18n/ClientIntl";
import { currentUnits } from "@/lib/auth/current-units";
import { currentUserId } from "@/lib/auth/current-user";
import { getZipPaintDay } from "@/lib/paintday/get-zip";
import { isUsZip } from "@/lib/utils";

export const revalidate = 900;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ zip: string }>;
}) {
  const { zip } = await params;
  return {
    title: `PaintDay ${zip}`,
    description: `PaintDay weather score and 14-day exterior window for ZIP ${zip}.`,
  };
}

export default async function ZipPage({
  params,
  searchParams,
}: {
  params: Promise<{ zip: string }>;
  searchParams: Promise<{ coat?: string; day?: string }>;
}) {
  const { zip } = await params;
  const { day: dayQuery } = await searchParams;
  if (!isUsZip(zip)) notFound();
  const [data, userId, units, locale, messages] = await Promise.all([
    getZipPaintDay(zip),
    currentUserId(),
    currentUnits(),
    getLocale(),
    getMessages(),
  ]);
  if (!data) notFound();

  return (
    <ClientIntl locale={locale} messages={messages}>
      <ZipForecastBoard
        zip={zip}
        place={data.place}
        forecast={data.forecast}
        signedIn={Boolean(userId)}
        units={units}
        dayQuery={dayQuery}
      />
    </ClientIntl>
  );
}
