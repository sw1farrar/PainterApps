"use client";

import * as React from "react";
import { toast } from "sonner";

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
import { getSupabaseEnvError } from "@/lib/supabase/env";
import type { Company, Profile } from "@/types/database";
import { updateProfile } from "./actions";

type ProfileClientProps = {
  profile: Profile;
  company: Company | null;
};

export function ProfileClient({ profile, company }: ProfileClientProps) {
  const envError = getSupabaseEnvError();
  const [loading, setLoading] = React.useState(false);
  const [fullName, setFullName] = React.useState(profile.full_name ?? "");
  const [avatarUrl, setAvatarUrl] = React.useState(profile.avatar_url ?? "");

  async function handleSave() {
    if (envError) {
      toast.error(envError);
      return;
    }

    setLoading(true);
    const result = await updateProfile({
      fullName,
      avatarUrl,
    });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to update profile.");
      return;
    }

    toast.success("Profile updated.");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="type-eyebrow">Account</p>
        <h1 className="font-display mt-1 text-2xl text-white md:text-3xl">
          Profile settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update how your name appears across the portal.
        </p>
      </div>

      {envError ? (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{envError}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
          <CardDescription>
            Role and company are managed by your admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Full name</Label>
            <Input
              id="profile-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Smith"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-avatar">Avatar URL</Label>
            <Input
              id="profile-avatar"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
            />
            <p className="text-xs text-muted-foreground">
              Optional image URL shown in the top bar.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted/10 p-3">
              <p className="text-xs text-muted-foreground">Role</p>
              <p className="mt-1 text-sm font-medium capitalize text-foreground">
                {profile.role.replace(/_/g, " ")}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/10 p-3">
              <p className="text-xs text-muted-foreground">Company</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {company?.name ?? "—"}
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={loading || !fullName.trim()}>
            {loading ? "Saving…" : "Save profile"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}