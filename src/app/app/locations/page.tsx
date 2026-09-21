import { redirect } from "next/navigation";

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ zip?: string }>;
}) {
  const { zip } = await searchParams;
  const q = zip ? `?zip=${encodeURIComponent(zip)}` : "";
  redirect(`/app/settings${q}#locations`);
}
