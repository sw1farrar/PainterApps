"use client";

import * as React from "react";
import { toast } from "sonner";

import { changePassword } from "@/lib/auth/password-actions";
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

export function ChangePasswordForm() {
  const envError = getSupabaseEnvError();
  const [loading, setLoading] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (envError) {
      toast.error(envError);
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("Choose a different password than your current one.");
      return;
    }

    setLoading(true);
    const result = await changePassword({
      currentPassword,
      newPassword,
    });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to update password.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated.");
  }

  return (
    <Card className="border-border bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Update the password you use to sign in to PainterApps.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {envError ? (
          <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {envError}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              allowPasswordManager
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              disabled={loading || Boolean(envError)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              allowPasswordManager
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              required
              disabled={loading || Boolean(envError)}
            />
            <p className="text-xs text-muted-foreground">
              At least 8 characters.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">Confirm new password</Label>
            <Input
              id="confirm-new-password"
              type="password"
              autoComplete="new-password"
              allowPasswordManager
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
              disabled={loading || Boolean(envError)}
            />
          </div>
          <Button
            type="submit"
            disabled={
              loading ||
              Boolean(envError) ||
              !currentPassword ||
              !newPassword ||
              !confirmPassword
            }
          >
            {loading ? "Updating…" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}