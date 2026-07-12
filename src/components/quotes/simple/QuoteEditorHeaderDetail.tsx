"use client";

import { UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { QuoteJobType, QuoteStatus } from "@/types/database";

const JOB_TYPE_LABELS: Record<QuoteJobType, string> = {
  interior: "Interior",
  exterior: "Exterior",
  both: "Interior + Exterior",
  specialty: "Specialty",
};

function customerInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

type QuoteEditorHeaderDetailProps = {
  mode: "create" | "edit";
  customerName?: string;
  jobName?: string;
  jobType: QuoteJobType;
  status: QuoteStatus;
  className?: string;
};

export function QuoteEditorHeaderDetail({
  mode,
  customerName,
  jobName,
  jobType,
  status,
  className,
}: QuoteEditorHeaderDetailProps) {
  const headerCustomerLabel =
    customerName ?? (mode === "create" ? "Select customer" : "No customer");
  const trimmedJobName = jobName?.trim() ?? "";
  const estimateLabel = mode === "create" ? "New estimate" : "Estimate";

  return (
    <div className={cn("flex min-w-0 items-center gap-2 sm:gap-2.5", className)}>
      {customerName ? (
        <Avatar className="h-9 w-9 shrink-0 sm:h-10 sm:w-10">
          <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
            {customerInitials(customerName)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/60 sm:h-10 sm:w-10">
          <UserRound className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <h1 className="inline-flex max-w-full min-w-0 items-center gap-2 text-left">
        <span className="min-w-0 truncate">
          <span className="text-sm font-medium text-muted-foreground sm:text-base">
            {estimateLabel}
          </span>
          <span className="mx-1.5 text-border/80">·</span>
          <span
            className={cn(
              "text-lg font-semibold tracking-tight sm:text-xl",
              customerName ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {headerCustomerLabel}
          </span>
          {trimmedJobName ? (
            <>
              <span className="mx-1.5 text-border/80">·</span>
              <span className="font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                {trimmedJobName}
              </span>
            </>
          ) : null}
        </span>
        <Badge
          variant="outline"
          className="shrink-0 px-2 py-0.5 text-[11px] font-normal leading-5 sm:text-xs"
        >
          {JOB_TYPE_LABELS[jobType]}
        </Badge>
        {status !== "draft" ? (
          <Badge
            variant="secondary"
            className="shrink-0 px-2 py-0.5 text-[11px] capitalize leading-5 sm:text-xs"
          >
            {status}
          </Badge>
        ) : null}
      </h1>
    </div>
  );
}