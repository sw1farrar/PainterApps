import * as React from "react";

import { LoginForm } from "@/components/auth/LoginForm";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <Card className="border-border bg-card/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Loading…</p>
          </CardContent>
        </Card>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}