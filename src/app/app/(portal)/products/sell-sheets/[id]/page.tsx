import { notFound, redirect } from "next/navigation";
import { getSellSheetRecord } from "@/app/app/(portal)/sell-sheets/actions";

type SellSheetDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductsSellSheetDetailPage({
  params,
}: SellSheetDetailPageProps) {
  const { id } = await params;
  const loaded = await getSellSheetRecord(id);

  if (!loaded) notFound();

  redirect(`/free-tools/build-sell-sheet?edit=${loaded.record.id}`);
}