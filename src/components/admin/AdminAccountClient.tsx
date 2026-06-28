"use client";

import * as React from "react";
import { toast } from "sonner";

import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { updateProfile } from "@/app/app/(portal)/profile/actions";
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
import type { Profile } from "@/types/database";

type AdminAccountClientProps = {
  profile: Profile;
  email: string | null;
};

export function AdminAccountClient({ profile, email }: AdminAccountClientProps) {
  const envError = getSupabaseEnvError();
  const [loading, setLoading] = React.useState(false);
  const [fullName, setFullName] = React.useState(profile.full_name ?? "");

  async function handleSaveProfile() {
    if (envError) {
      toast.error(envError);
      return;
    }

    setLoading(true);
    const result = await updateProfile({ fullName });
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
        <h1 className="font-display text-3xl text-white">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your site admin sign-in and display name.
        </p>
      </div>

      <Card className="border-border bg-card/60">
        <CardHeader>
          <CardTitle className="text-white">Profile</CardTitle>
          <CardDescription>
            How your name appears in the admin console.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-profile-name">Full name</Label>
            <Input
              id="admin-profile-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="rounded-lg border border-border bg-muted/10 p-3">
            <p className="text-xs text-muted-foreground">Sign-in email</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {email ?? "—"}
            </p>
          </div>
          <Button
            onClick={handleSaveProfile}
            disabled={loading || !fullName.trim() || Boolean(envError)}
          >
            {loading ? "Saving…" : "Save profile"}
          </Button>
        </CardContent>
      </Card>

      <ChangePasswordForm />
    </div>
  );
}