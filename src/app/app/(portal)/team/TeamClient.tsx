"use client";

import * as React from "react";
import { format } from "date-fns";
import { Copy, Mail, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

import { AppDrawer } from "@/components/portal/AppDrawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSupabaseEnvError } from "@/lib/supabase/env";
import type { Profile, UserRole } from "@/types/database";
import { inviteTeamMember, revokeInvite, updateMemberRole } from "./actions";

type PendingInvite = {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  expires_at: string;
};

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "project_manager", label: "Project manager" },
  { value: "job_superintendent", label: "Job superintendent" },
  { value: "painter", label: "Painter" },
  { value: "finance", label: "Finance" },
];

type TeamClientProps = {
  members: Profile[];
  invites: PendingInvite[];
  currentUserId: string;
};

export function TeamClient({
  members,
  invites,
  currentUserId,
}: TeamClientProps) {
  const envError = getSupabaseEnvError();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<UserRole>("painter");
  const [roleUpdatingId, setRoleUpdatingId] = React.useState<string | null>(
    null,
  );

  async function handleInvite() {
    if (envError) {
      toast.error(envError);
      return;
    }

    setLoading(true);
    const result = await inviteTeamMember({
      email: inviteEmail,
      role: inviteRole,
    });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to send invite.");
      return;
    }

    toast.success("Invite sent.");
    if (result.data?.inviteUrl) {
      try {
        await navigator.clipboard.writeText(result.data.inviteUrl);
        toast.message("Invite link copied to clipboard.");
      } catch {
        // Clipboard may be unavailable
      }
    }

    setInviteEmail("");
    setDrawerOpen(false);
  }

  async function handleRoleChange(memberId: string, role: UserRole) {
    if (envError) {
      toast.error(envError);
      return;
    }

    setRoleUpdatingId(memberId);
    const result = await updateMemberRole(memberId, role);
    setRoleUpdatingId(null);

    if (!result.success) {
      toast.error(result.error ?? "Failed to update role.");
      return;
    }

    toast.success("Role updated.");
  }

  async function handleRevoke(inviteId: string) {
    if (envError) {
      toast.error(envError);
      return;
    }

    const result = await revokeInvite(inviteId);
    if (!result.success) {
      toast.error(result.error ?? "Failed to revoke invite.");
      return;
    }

    toast.success("Invite revoked.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="type-eyebrow">Team</p>
          <h1 className="font-display mt-1 text-2xl text-white md:text-3xl">
            Team members
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {members.length} member{members.length === 1 ? "" : "s"} ·{" "}
            {invites.length} pending invite{invites.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite member
        </Button>
      </div>

      <Card className="border-border bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Active members</CardTitle>
          <CardDescription>
            Everyone with access to your company portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-muted/10 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground">
                  {member.full_name ?? "Unnamed user"}
                  {member.id === currentUserId ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (you)
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  Joined {format(new Date(member.created_at), "MMM d, yyyy")}
                </p>
              </div>
              {member.id === currentUserId ? (
                <Badge variant="secondary" className="capitalize w-fit">
                  {member.role.replace(/_/g, " ")}
                </Badge>
              ) : (
                <Select
                  value={member.role}
                  onValueChange={(value) =>
                    handleRoleChange(member.id, value as UserRole)
                  }
                  disabled={roleUpdatingId === member.id}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {invites.length > 0 ? (
        <Card className="border-border bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Pending invites</CardTitle>
            <CardDescription>
              Invites expire 7 days after they are sent.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-muted/10 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {invite.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Sent {format(new Date(invite.created_at), "MMM d, yyyy")} ·
                    expires {format(new Date(invite.expires_at), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {invite.role.replace(/_/g, " ")}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRevoke(invite.id)}
                    aria-label="Revoke invite"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <AppDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Invite team member"
        description="They'll receive an email with a link to join your company."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-contact">Email</Label>
            <Input
              id="invite-contact"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teammate@company.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={inviteRole}
              onValueChange={(value) => setInviteRole(value as UserRole)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            onClick={handleInvite}
            disabled={loading || !inviteEmail.trim()}
          >
            {loading ? "Sending…" : "Send invite"}
          </Button>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Copy className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            The invite link is also copied to your clipboard after sending.
          </p>
        </div>
      </AppDrawer>
    </div>
  );
}