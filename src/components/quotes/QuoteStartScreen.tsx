"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  FileText,
  Home,
  Layers,
  Paintbrush,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  createQuote,
  duplicateQuote,
  saveQuoteDraft,
} from "@/app/app/(portal)/quotes/actions";
import { CustomerCombobox } from "@/components/quotes/CustomerCombobox";
import { SavedTemplateCard } from "@/components/quotes/SavedTemplateCard";
import { AddressFields } from "@/components/forms/AddressFields";
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
import { hasMinimumJobAddress } from "@/lib/address";
import {
  QUOTE_TEMPLATE_PRESETS,
  type QuoteTemplatePreset,
} from "@/lib/quotes/templates/presets";
import {
  templatePayloadToDraft,
  type QuoteTemplatePayload,
} from "@/lib/quotes/templates/serialize";
import { cn } from "@/lib/utils";
import type { Customer, QuoteJobType, QuoteTemplate } from "@/types/database";

const JOB_TYPES: {
  id: QuoteJobType;
  label: string;
  icon: typeof Home;
}[] = [
  { id: "interior", label: "Interior", icon: Home },
  { id: "exterior", label: "Exterior", icon: Paintbrush },
  { id: "both", label: "Interior + Exterior", icon: Layers },
  { id: "specialty", label: "Specialty", icon: Sparkles },
];

type QuoteStartScreenProps = {
  customers: Customer[];
  lastQuoteId?: string | null;
  savedTemplates?: QuoteTemplate[];
  embedded?: boolean;
  onQuoteReady?: (quoteId: string) => void;
  onCustomerCreated?: (customer: Customer) => void;
};

export function QuoteStartScreen({
  customers: initialCustomers,
  lastQuoteId,
  savedTemplates = [],
  embedded = false,
  onQuoteReady,
  onCustomerCreated,
}: QuoteStartScreenProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [templates, setTemplates] = useState(savedTemplates);
  const [customers, setCustomers] = useState(initialCustomers);
  const [jobType, setJobType] = useState<QuoteJobType>("interior");
  const [customerId, setCustomerId] = useState("");
  const [quoteName, setQuoteName] = useState("");
  const [templateId, setTemplateId] = useState("blank");
  const [jobAddress, setJobAddress] = useState({
    job_address: "",
    job_address_line2: "",
    job_city: "",
    job_state: "",
    job_zip: "",
  });

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const visiblePresets = useMemo(
    () =>
      QUOTE_TEMPLATE_PRESETS.filter(
        (t) =>
          t.id === "blank" ||
          t.jobType === jobType ||
          (jobType === "both" &&
            (t.jobType === "interior" || t.jobType === "exterior")),
      ),
    [jobType],
  );

  const visibleSavedTemplates = useMemo(
    () =>
      templates.filter(
        (template) =>
          template.job_type === jobType ||
          (jobType === "both" && template.job_type !== "specialty"),
      ),
    [templates, jobType],
  );

  const selectedPreset = QUOTE_TEMPLATE_PRESETS.find((t) => t.id === templateId);
  const selectedSavedTemplate = templateId.startsWith("saved:")
    ? templates.find((template) => template.id === templateId.slice(6))
    : undefined;

  const handleCustomerCreated = (customer: Customer) => {
    setCustomers((prev) =>
      [...prev, customer].sort((a, b) => a.name.localeCompare(b.name)),
    );
    onCustomerCreated?.(customer);
    if (!jobAddress.job_address && customer.address) {
      setJobAddress({
        job_address: customer.address ?? "",
        job_address_line2: customer.address_line2 ?? "",
        job_city: customer.city ?? "",
        job_state: customer.state ?? "",
        job_zip: customer.zip ?? "",
      });
    }
  };

  const createQuoteAndNavigate = async (
    quoteId: string,
    step: "estimator" | "setup" = "estimator",
  ) => {
    if (embedded && onQuoteReady) {
      onQuoteReady(quoteId);
      return;
    }
    router.push(`/app/quotes/${quoteId}?step=${step}`);
  };

  const startBuilding = (template: QuoteTemplatePreset) => {
    if (!customerId) {
      toast.error("Select a customer to continue.");
      return;
    }
    if (!hasMinimumJobAddress(jobAddress)) {
      toast.error("Enter the full job address (street, city, state, ZIP).");
      return;
    }

    startTransition(async () => {
      const result = await createQuote({
        customer_id: customerId,
        name: quoteName.trim() || `${selectedCustomer?.name ?? "New"} estimate`,
        job_type: jobType,
        ...jobAddress,
        job_address: jobAddress.job_address.trim(),
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      const quoteId = result.data.id;

      if (template.rooms.length > 0) {
        const roomResult = await saveQuoteDraft(quoteId, {
          rooms: template.rooms.map((room, index) => ({
            ...room,
            sort_order: index,
            photo_url: null,
            is_optional: false,
            length_ft: null,
            width_ft: null,
            height_ft: null,
          })),
        });
        if (!roomResult.success) {
          toast.error(
            `${roomResult.error} Opening the draft so you can continue.`,
          );
          await createQuoteAndNavigate(quoteId);
          return;
        }
      }

      await createQuoteAndNavigate(quoteId);
    });
  };

  const startBuildingFromSaved = (template: QuoteTemplate) => {
    if (!customerId) {
      toast.error("Select a customer to continue.");
      return;
    }
    if (!hasMinimumJobAddress(jobAddress)) {
      toast.error("Enter the full job address (street, city, state, ZIP).");
      return;
    }

    startTransition(async () => {
      const payload = template.payload as QuoteTemplatePayload;
      const result = await createQuote({
        customer_id: customerId,
        name: quoteName.trim() || `${selectedCustomer?.name ?? "New"} estimate`,
        job_type: template.job_type,
        estimation_mode: payload.estimation_mode ?? "hybrid",
        ...jobAddress,
        job_address: jobAddress.job_address.trim(),
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      const quoteId = result.data.id;
      const draft = templatePayloadToDraft(template);
      draft.header = {
        ...draft.header,
        customer_id: customerId,
        name: quoteName.trim() || `${selectedCustomer?.name ?? "New"} estimate`,
        job_type: template.job_type,
        ...jobAddress,
        job_address: jobAddress.job_address.trim(),
      };

      const saveResult = await saveQuoteDraft(quoteId, draft);
      if (!saveResult.success) {
        toast.error(
          `${saveResult.error} Opening the draft so you can continue.`,
        );
        await createQuoteAndNavigate(quoteId);
        return;
      }

      await createQuoteAndNavigate(quoteId);
    });
  };

  const handleDuplicateLast = () => {
    if (!lastQuoteId) return;

    startTransition(async () => {
      const result = await duplicateQuote(lastQuoteId);
      if (!result.success) {
        toast.error(result.error ?? "Could not duplicate last quote.");
        return;
      }
      if (embedded && onQuoteReady) {
        onQuoteReady(result.data!.id);
        return;
      }
      router.push(`/app/quotes/${result.data!.id}?step=estimator`);
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-4">
      {!embedded ? (
        <div className="space-y-2 text-center sm:text-left">
          <p className="type-eyebrow">New estimate</p>
          <h1 className="font-display text-3xl text-white sm:text-4xl">
            Start your quote
          </h1>
          <p className="type-lead text-sm sm:text-base">
            Pick a job type, customer, and template — then jump straight into
            building.
          </p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Job type</CardTitle>
          <CardDescription>What kind of work is this?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {JOB_TYPES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setJobType(id);
                  setTemplateId("blank");
                }}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors",
                  jobType === id
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-muted/20 hover:border-primary/40",
                )}
              >
                <Icon className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customer & site</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CustomerCombobox
            customers={customers}
            value={customerId}
            onChange={setCustomerId}
            onCustomerCreated={handleCustomerCreated}
          />
          <div className="space-y-2">
            <Label htmlFor="start-quote-name">Job name (optional)</Label>
            <Input
              id="start-quote-name"
              value={quoteName}
              onChange={(e) => setQuoteName(e.target.value)}
              placeholder={
                selectedCustomer
                  ? `${selectedCustomer.name} — interior repaint`
                  : "e.g. Smith residence interior"
              }
            />
          </div>
          <AddressFields
            idPrefix="start-job"
            value={{
              address: jobAddress.job_address,
              address_line2: jobAddress.job_address_line2,
              city: jobAddress.job_city,
              state: jobAddress.job_state,
              zip: jobAddress.job_zip,
            }}
            onChange={(value) =>
              setJobAddress({
                job_address: value.address ?? "",
                job_address_line2: value.address_line2 ?? "",
                job_city: value.city ?? "",
                job_state: value.state ?? "",
                job_zip: value.zip ?? "",
              })
            }
            line1Label="Job street address"
            required
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Template</CardTitle>
          <CardDescription>
            Pre-fill areas or start blank. You can edit everything later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePresets.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setTemplateId(template.id)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors",
                  templateId === template.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-muted/20 hover:border-primary/40",
                )}
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <p className="font-semibold text-foreground">{template.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {template.description}
                </p>
                {template.rooms.length > 0 ? (
                  <p className="mt-2 text-xs font-medium text-primary">
                    {template.rooms.length} areas included
                  </p>
                ) : null}
              </button>
            ))}

            {lastQuoteId ? (
              <button
                type="button"
                onClick={handleDuplicateLast}
                disabled={isPending}
                className="rounded-xl border border-dashed border-border p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/20"
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Copy className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="font-semibold text-foreground">
                  Duplicate last job
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Copy your most recent quote as a starting point
                </p>
              </button>
            ) : null}
          </div>

          {visibleSavedTemplates.length > 0 ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Your saved templates
                </p>
                <p className="text-xs text-muted-foreground">
                  Rename or delete from the menu on each card.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleSavedTemplates.map((template) => {
              const savedId = `saved:${template.id}`;

              return (
                <SavedTemplateCard
                  key={template.id}
                  template={template}
                  selected={templateId === savedId}
                  onSelect={() => setTemplateId(savedId)}
                  onUpdated={(updated) =>
                    setTemplates((prev) =>
                      prev.map((item) =>
                        item.id === updated.id ? updated : item,
                      ),
                    )
                  }
                  onDeleted={(deletedId) => {
                    setTemplates((prev) =>
                      prev.filter((item) => item.id !== deletedId),
                    );
                    if (templateId === `saved:${deletedId}`) {
                      setTemplateId("blank");
                    }
                  }}
                />
              );
            })}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Advanced options (custom estimation mode) available in the editor.
        </p>
        <Button
          size="lg"
          disabled={isPending}
          onClick={() => {
            if (selectedSavedTemplate) {
              startBuildingFromSaved(selectedSavedTemplate);
              return;
            }
            if (selectedPreset) startBuilding(selectedPreset);
          }}
        >
          {isPending ? "Creating…" : "Start building"}
        </Button>
      </div>
    </div>
  );
}