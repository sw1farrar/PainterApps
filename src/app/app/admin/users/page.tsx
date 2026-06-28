import { listAdminUsers } from "@/app/app/admin/actions";
import { AdminUsersClient } from "@/components/admin/AdminUsersClient";
import { requireSiteAdmin } from "@/lib/auth/session";

export default async function AdminUsersPage() {
  const session = await requireSiteAdmin();
  const users = await listAdminUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-white">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage roles and site admin access across all tenants.
        </p>
      </div>

      <AdminUsersClient users={users} currentUserId={session.profile.id} />
    </div>
  );
}