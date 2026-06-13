"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateJobStatus } from "../actions";

type JobStatusPanelProps = {
  jobId: string;
  status: string;
};

export function JobStatusPanel({ jobId, status }: JobStatusPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function handleMarkCompleted() {
    setLoading(true);
    const result = await updateJobStatus(jobId, "completed");
    setLoading(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to update job.");
      return;
    }

    toast.success("Job marked as completed.");
    router.refresh();
  }

  async function handleReopen() {
    setLoading(true);
    const result = await updateJobStatus(jobId, "active");
    setLoading(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to update job.");
      return;
    }

    toast.success("Job reopened.");
    router.refresh();
  }

  const isCompleted = status === "completed";

  return (
    <Card className="border-border bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Job status</CardTitle>
        <CardDescription>
          Track progress from active work through completion.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm capitalize text-foreground">
          Current status: <strong>{status}</strong>
        </p>
        {isCompleted ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleReopen}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Reopen job
          </Button>
        ) : (
          <Button className="w-full" onClick={handleMarkCompleted} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Mark completed
          </Button>
        )}
      </CardContent>
    </Card>
  );
}