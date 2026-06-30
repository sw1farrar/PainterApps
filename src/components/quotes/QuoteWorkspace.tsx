"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchQuoteWorkspace } from "@/app/app/(portal)/quotes/actions";
import { QuoteStartScreen } from "@/components/quotes/QuoteStartScreen";
import { QuoteWorkspaceShell } from "@/components/quotes/QuoteWorkspaceShell";
import type { QuoteStep } from "@/components/quotes/hooks/useQuoteBuilder";
import { resumeStepFromWorkspace } from "@/lib/quotes/resume-step";
import type { TierPaintConfigInput } from "@/app/app/(portal)/quotes/actions";
import type {
  Company,
  Customer,
  Quote,
  QuoteLineItem,
  QuoteRoom,
  QuoteSurface,
  QuoteTemplate,
  QuoteTier,
  QuoteUpgradeRules,
} from "@/types/database";

const QuoteBuilder = dynamic(
  () =>
    import("@/components/quotes/QuoteBuilder").then((m) => ({
      default: m.QuoteBuilder,
    })),
  {
    loading: () => (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

type LoadedWorkspace = {
  quote: Quote;
  rooms: QuoteRoom[];
  surfaces: QuoteSurface[];
  lineItems: QuoteLineItem[];
  tiers: QuoteTier[];
  tierPaintConfig: TierPaintConfigInput[];
  jobId: string | null;
};

type QuoteWorkspaceProps = {
  open: boolean;
  mode: "new" | "edit";
  quoteId?: string | null;
  initialStep?: QuoteStep;
  company: Company;
  customers: Customer[];
  upgradeRules?: QuoteUpgradeRules | null;
  lastQuoteId?: string | null;
  savedTemplates?: QuoteTemplate[];
  onClose: () => void;
  onPopOut: (quoteId: string, step?: QuoteStep) => void;
  onQuoteCreated?: (quoteId: string, step: QuoteStep) => void;
};

export function QuoteWorkspace({
  open,
  mode: initialMode,
  quoteId: initialQuoteId,
  initialStep = "estimator",
  company,
  customers: initialCustomers,
  upgradeRules,
  lastQuoteId,
  savedTemplates = [],
  onClose,
  onPopOut,
  onQuoteCreated,
}: QuoteWorkspaceProps) {
  const [mode, setMode] = useState<"new" | "edit">(initialMode);
  const [quoteId, setQuoteId] = useState<string | null>(initialQuoteId ?? null);
  const [workspace, setWorkspace] = useState<LoadedWorkspace | null>(null);
  const [workspaceCustomers, setWorkspaceCustomers] =
    useState<Customer[]>(initialCustomers);
  const [builderStep, setBuilderStep] = useState<QuoteStep>(initialStep);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const flushSaveRef = useRef<(() => Promise<void>) | null>(null);
  const [isPending, startTransition] = useTransition();
  const loadedQuoteIdRef = useRef<string | null>(null);
  const pendingQuoteIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      setLoadError(null);
      setMode("new");
      setQuoteId(null);
      setWorkspace(null);
      setBuilderStep("estimator");
      setIsDirty(false);
      loadedQuoteIdRef.current = null;
      pendingQuoteIdRef.current = null;
      flushSaveRef.current = null;
      return;
    }

    setWorkspaceCustomers(initialCustomers);

    if (initialMode === "new") {
      if (pendingQuoteIdRef.current) return;
      setMode("new");
      setQuoteId(null);
      setWorkspace(null);
      setBuilderStep("estimator");
      setLoadError(null);
      loadedQuoteIdRef.current = null;
    } else if (initialMode === "edit" && initialQuoteId) {
      pendingQuoteIdRef.current = null;
      setMode("edit");
      setQuoteId(initialQuoteId);
      setBuilderStep(initialStep);
      setLoadError(null);
      if (loadedQuoteIdRef.current !== initialQuoteId) {
        setWorkspace(null);
      }
    }

    setIsDirty(false);
  }, [open, initialMode, initialQuoteId, initialCustomers, initialStep]);

  useEffect(() => {
    if (!open || mode !== "edit" || !quoteId) {
      if (mode === "new") setWorkspace(null);
      return;
    }

    if (loadedQuoteIdRef.current === quoteId) return;

    setLoadError(null);
    startTransition(async () => {
      const result = await fetchQuoteWorkspace(quoteId);
      if (!result.success) {
        setLoadError(result.error);
        toast.error(result.error);
        return;
      }
      loadedQuoteIdRef.current = quoteId;
      pendingQuoteIdRef.current = null;
      setWorkspace(result.data);
      const step = resumeStepFromWorkspace(result.data);
      setBuilderStep(step);
    });
  }, [open, mode, quoteId]);

  const handleCustomerCreated = useCallback((customer: Customer) => {
    setWorkspaceCustomers((prev) =>
      [...prev, customer].sort((a, b) => a.name.localeCompare(b.name)),
    );
  }, []);

  const loadWorkspace = useCallback(async (id: string) => {
    loadedQuoteIdRef.current = null;
    setLoadError(null);
    const result = await fetchQuoteWorkspace(id);
    if (!result.success) {
      setLoadError(result.error);
      toast.error(result.error);
      return null;
    }
    loadedQuoteIdRef.current = id;
    setWorkspace(result.data);
    const step = resumeStepFromWorkspace(result.data);
    setBuilderStep(step);
    return result.data;
  }, []);

  const handleQuoteReady = useCallback(
    (id: string) => {
      pendingQuoteIdRef.current = id;
      onQuoteCreated?.(id, "estimator");
      setQuoteId(id);
      setMode("edit");
      setBuilderStep("estimator");
    },
    [onQuoteCreated],
  );

  const handleFlushReady = useCallback((flush: () => Promise<void>) => {
    flushSaveRef.current = flush;
  }, []);

  const handleSaveAndClose = useCallback(async () => {
    if (flushSaveRef.current) {
      setIsSaving(true);
      try {
        await flushSaveRef.current();
      } finally {
        setIsSaving(false);
      }
    }
  }, []);

  const handlePopOut = useCallback(async () => {
    if (!quoteId) return;
    if (isDirty && flushSaveRef.current) {
      setIsSaving(true);
      try {
        await flushSaveRef.current();
      } finally {
        setIsSaving(false);
      }
    }
    onPopOut(quoteId, builderStep);
  }, [builderStep, isDirty, onPopOut, quoteId]);

  const title =
    mode === "new"
      ? "New estimate"
      : workspace?.quote.name?.trim() ||
        workspace?.quote.job_address ||
        "Edit estimate";

  const subtitle =
    mode === "edit" && workspace
      ? workspaceCustomers.find((c) => c.id === workspace.quote.customer_id)
          ?.name
      : undefined;

  const isLoading =
    mode === "edit" &&
    Boolean(quoteId) &&
    (isPending || (!workspace && !loadError));

  return (
    <QuoteWorkspaceShell
      open={open}
      title={title}
      subtitle={subtitle}
      isDirty={isDirty}
      isSaving={isSaving}
      showPopOut={mode === "edit" && Boolean(quoteId)}
      onPopOut={handlePopOut}
      onClose={onClose}
      onSaveAndClose={handleSaveAndClose}
    >
      {mode === "new" ? (
        <div className="px-4 py-4 sm:px-6">
          <QuoteStartScreen
            customers={workspaceCustomers}
            lastQuoteId={lastQuoteId}
            savedTemplates={savedTemplates}
            embedded
            onQuoteReady={handleQuoteReady}
            onCustomerCreated={handleCustomerCreated}
          />
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <p className="text-sm text-destructive">{loadError}</p>
          {quoteId ? (
            <button
              type="button"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => void loadWorkspace(quoteId)}
            >
              Try again
            </button>
          ) : null}
        </div>
      ) : isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : workspace ? (
        <div className="px-4 sm:px-6">
          <QuoteBuilder
            mode="edit"
            workspaceMode="modal"
            initialStep={builderStep}
            skipSetup={
              builderStep === "estimator" || Boolean(workspace.rooms.length)
            }
            quote={workspace.quote}
            jobId={workspace.jobId}
            rooms={workspace.rooms}
            surfaces={workspace.surfaces}
            lineItems={workspace.lineItems}
            tiers={workspace.tiers}
            tierPaintConfig={workspace.tierPaintConfig}
            customers={workspaceCustomers}
            company={company}
            upgradeRules={upgradeRules}
            onWorkspaceClose={onClose}
            onPopOut={() => quoteId && onPopOut(quoteId, builderStep)}
            onDirtyChange={setIsDirty}
            onSavingChange={setIsSaving}
            onFlushReady={handleFlushReady}
          />
        </div>
      ) : null}
    </QuoteWorkspaceShell>
  );
}