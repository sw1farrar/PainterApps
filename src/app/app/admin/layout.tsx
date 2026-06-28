import { AdminShell } from "@/components/portal/AdminShell";
import {
  requireEmailConfirmed,
  requireSiteAdmin,
} from "@/lib/auth/session";

export const maxDuration = 300;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireEmailConfirmed();
  const session = await requireSiteAdmin();

  return <AdminShell session={session}>{children}</AdminShell>;
}