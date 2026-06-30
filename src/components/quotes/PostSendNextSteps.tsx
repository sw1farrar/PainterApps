"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookmarkPlus,
  CheckCircle2,
  Copy,
  CopyPlus,
  Download,
  Eye,
  FileText,
  HardHat,
  Pencil,
  Plus,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { QuoteStatus } from "@/types/database";

type PostSendNextStepsProps = {
  status: QuoteStatus;
  quoteId?: string;
  portalUrl: string | null;
  customerName?: string;
  jobId?: string | null;
  onCopyPortalLink: () => void;
  onDuplicate: () => void;
  onReviseToDraft?: () => void;
  onResend?: () => void;
  onSaveAsTemplate: () => void;
  onOpenPreview?: () => void;
  isPending?: boolean;
};

const STATUS_HEADLINES: Record<Exclude<QuoteStatus, "draft">, string> = {
  sent: "Quote sent!",
  accepted: "Quote accepted",
  declined: "Quote declined",
};

const STATUS_DESCRIPTIONS: Record<Exclude<QuoteStatus, "draft">, string> = {
  sent: "Your customer received the proposal. Here's what to do next.",
  accepted: "Great news — follow up to schedule the job.",
  declined: "You can revise and resend, or start a fresh estimate.",
};

export function PostSendNextSteps({
  status,
  quoteId,
  portalUrl,
  customerName,
  jobId,
  onCopyPortalLink,
  onDuplicate,
  onReviseToDraft,
  onResend,
  onSaveAsTemplate,
  onOpenPreview,
  isPending,
}: PostSendNextStepsProps) {
  if (status === "draft") return null;

  const headline = STATUS_HEADLINES[status];
  const description = STATUS_DESCRIPTIONS[status];

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <CardTitle>{headline}</CardTitle>
            <CardDescription className="mt-1">
              {customerName ? (
                <>
                  <span className="font-medium text-foreground">
                    {customerName}
                  </span>
                  {" — "}
                </>
              ) : null}
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {status === "accepted" && jobId ? (
            <Button variant="default" className="justify-start" asChild>
              <Link href={`/app/jobs/${jobId}`}>
                <HardHat className="h-4 w-4" />
                View job
              </Link>
            </Button>
          ) : null}
          {(status === "sent" || status === "declined") && onReviseToDraft ? (
            <Button
              variant="outline"
              className="justify-start"
              onClick={onReviseToDraft}
              disabled={isPending}
            >
              <Pencil className="h-4 w-4" />
              Revise quote
            </Button>
          ) : null}
          {status === "sent" && onResend ? (
            <Button
              variant="outline"
              className="justify-start"
              onClick={onResend}
              disabled={isPending}
            >
              <Send className="h-4 w-4" />
              Resend to customer
            </Button>
          ) : null}
          {portalUrl ? (
            <Button variant="outline" className="justify-start" onClick={onCopyPortalLink}>
              <Copy className="h-4 w-4" />
              Copy portal link
            </Button>
          ) : null}
          {onOpenPreview ? (
            <Button variant="outline" className="justify-start" onClick={onOpenPreview}>
              <Eye className="h-4 w-4" />
              Customer preview
            </Button>
          ) : null}
          {quoteId ? (
            <Button variant="outline" className="justify-start" asChild>
              <a
                href={`/api/quotes/${quoteId}/marketing-sheet`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </a>
            </Button>
          ) : null}
          <Button
            variant="outline"
            className="justify-start"
            onClick={onSaveAsTemplate}
            disabled={isPending}
          >
            <BookmarkPlus className="h-4 w-4" />
            Save as template
          </Button>
          {quoteId ? (
            <Button
              variant="outline"
              className="justify-start"
              onClick={onDuplicate}
              disabled={isPending}
            >
              <CopyPlus className="h-4 w-4" />
              Duplicate for new job
            </Button>
          ) : null}
          <Button variant="outline" className="justify-start" asChild>
            <Link href="/app/quotes/new">
              <Plus className="h-4 w-4" />
              New estimate
            </Link>
          </Button>
          <Button variant="outline" className="justify-start" asChild>
            <Link href="/app/quotes">
              <FileText className="h-4 w-4" />
              All quotes
              <ArrowRight className="ml-auto h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}