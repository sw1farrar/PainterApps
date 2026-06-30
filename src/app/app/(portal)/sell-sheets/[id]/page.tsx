import { redirect } from "next/navigation";

type SellSheetRedirectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SellSheetRedirectPage({
  params,
}: SellSheetRedirectPageProps) {
  const { id } = await params;
  redirect(`/app/products/sell-sheets/${id}`);
}