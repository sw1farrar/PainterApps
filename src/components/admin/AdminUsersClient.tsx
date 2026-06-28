"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  setUserSiteAdmin,
  updateUserRole,
} from "@/app/app/admin/actions";
import type { AdminUserRow } from "@/app/app/admin/types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserRole } from "@/types/database";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "project_manager", label: "Project manager" },
  { value: "job_superintendent", label: "Job superintendent" },
  { value: "painter", label: "Painter" },
  { value: "finance", label: "Finance" },
];

type AdminUsersClientProps = {
  users: AdminUserRow[];
  currentUserId: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function AdminUsersClient({
  users,
  currentUserId,
}: AdminUsersClientProps) {
  const router = useRouter();
  const [roleUpdatingId, setRoleUpdatingId] = React.useState<string | null>(
    null,
  );
  const [adminUpdatingId, setAdminUpdatingId] = React.useState<string | null>(
    null,
  );

  async function handleRoleChange(userId: string, role: UserRole) {
    setRoleUpdatingId(userId);
    const result = await updateUserRole(userId, role);
    setRoleUpdatingId(null);

    if (!result.success) {
      toast.error(result.error ?? "Failed to update role.");
      return;
    }

    toast.success("Role updated.");
    router.refresh();
  }

  async function handleSiteAdminToggle(userId: string, isSiteAdmin: boolean) {
    setAdminUpdatingId(userId);
    const result = await setUserSiteAdmin(userId, isSiteAdmin);
    setAdminUpdatingId(null);

    if (!result.success) {
      toast.error(result.error ?? "Failed to update site admin access.");
      return;
    }

    toast.success(
      isSiteAdmin ? "Site admin access granted." : "Site admin access removed.",
    );
    router.refresh();
  }

  return (
    <Card className="border-border bg-card/60">
      <CardHeader>
        <CardTitle className="text-white">All users</CardTitle>
        <CardDescription>
          {users.length} account{users.length === 1 ? "" : "s"} across all
          companies
        </CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">User</th>
                  <th className="px-3 py-2 font-medium">Company</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Email status</th>
                  <th className="px-3 py-2 font-medium">Site admin</th>
                  <th className="px-3 py-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((row) => {
                  const isSelf = row.profile.id === currentUserId;
                  const busy =
                    roleUpdatingId === row.profile.id ||
                    adminUpdatingId === row.profile.id;

                  return (
                    <tr
                      key={row.profile.id}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="px-3 py-3">
                        <p className="font-medium text-white">
                          {row.profile.full_name ?? "Unnamed user"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.email ?? "No email"}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {row.company_name ?? "—"}
                      </td>
                      <td className="px-3 py-3">
                        <Select
                          value={row.profile.role}
                          disabled={busy}
                          onValueChange={(value) =>
                            handleRoleChange(row.profile.id, value as UserRole)
                          }
                        >
                          <SelectTrigger className="h-8 w-[11rem]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-3">
                        {row.email_confirmed ? (
                          <Badge variant="secondary">Confirmed</Badge>
                        ) : (
                          <Badge variant="outline">Unconfirmed</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-input"
                            checked={row.profile.is_site_admin}
                            disabled={busy}
                            onChange={(event) =>
                              handleSiteAdminToggle(
                                row.profile.id,
                                event.target.checked,
                              )
                            }
                          />
                          <Label className="text-xs text-muted-foreground">
                            {isSelf ? "You" : "Site admin"}
                          </Label>
                        </label>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {formatDate(row.profile.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}