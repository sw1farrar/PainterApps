import { AdminAccountClient } from "@/components/admin/AdminAccountClient";
import { getAuthUser, requireSiteAdmin } from "@/lib/auth/session";

export default async function AdminAccountPage() {
  const session = await requireSiteAdmin();
  const user = await getAuthUser();

  return (
    <AdminAccountClient
      profile={session.profile}
      email={user?.email ?? null}
    />
  );
}