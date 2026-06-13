"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  CopyPlus,
  Download,
  Loader2,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AppDrawer } from "@/components/portal/AppDrawer";
import { PhotoGalleryUpload } from "@/components/storage/PhotoGalleryUpload";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createQuote,
  duplicateQuote,
  saveLineItems,
  saveRooms,
  saveTiers,
  sendQuote,
  updateQuote,
  type LineItemInput,
  type RoomInput,
  type TierInput,
} from "@/app/app/(portal)/quotes/actions";
import {
  buildLineItemsFromRooms,
  getCompanyPricingSummary,
} from "@/lib/quotes/estimate-from-rooms";
import {
  calculateQuoteTotals,
  calculateTierPrices,
  estimateGallons,
  lineItemsSubtotal,
} from "@/lib/quotes/pricing";
import { formatCurrency } from "@/lib/utils";
import type {
  Company,
  Customer,
  LineItemType,
  Quote,
  QuoteLineItem,
  QuoteRoom,
  QuoteTier,
  QuoteTierName,
  QuoteUpgradeRules,
} from "@/types/database";

const STEPS = ["setup", "estimator", "line-items", "tiers", "review"] as const;
type Step = (typeof STEPS)[number];

const TIER_NAMES: QuoteTierName[] = ["good", "better", "best", "beautiful"];

const TIER_LABELS: Record<QuoteTierName, string> = {
  good: "Good",
  better: "Better",
  best: "Best",
  beautiful: "Beautiful",
};

const TIER_DEFAULTS: Record<
  QuoteTierName,
  { features: string[]; benefits: string[] }
> = {
  good: {
    features: ["Standard paint", "Basic prep", "1-year warranty"],
    benefits: ["Affordable quality finish", "Reliable timeline"],
  },
  better: {
    features: ["Premium paint", "Enhanced prep", "2-year warranty"],
    benefits: ["Better coverage & durability", "Smoother finish"],
  },
  best: {
    features: ["Top-tier paint", "Full prep & repair", "3-year warranty"],
    benefits: ["Maximum durability", "Designer-grade finish"],
  },
  beautiful: {
    features: ["Luxury paint system", "White-glove service", "5-year warranty"],
    benefits: ["Showroom-quality results", "Priority scheduling"],
  },
};

const EMPTY_ROOM: RoomInput = {
  name: "",
  surface_type: "drywall",
  condition: "good",
  sq_ft: 0,
  color_codes: "",
  coats: 2,
  prep_work: "",
};

const EMPTY_LINE_ITEM: LineItemInput = {
  type: "labor",
  description: "",
  qty: 1,
  unit_cost: 0,
  markup: 0,
};

type QuoteBuilderProps = {
  mode: "create" | "edit";
  quote?: Quote;
  rooms?: QuoteRoom[];
  lineItems?: QuoteLineItem[];
  tiers?: QuoteTier[];
  customers: Customer[];
  company: Company;
  upgradeRules?: QuoteUpgradeRules | null;
};

function parseLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinLines(values: string[]): string {
  return values.join("\n");
}

export function QuoteBuilder({
  mode,
  quote,
  rooms: initialRooms = [],
  lineItems: initialLineItems = [],
  tiers: initialTiers = [],
  customers,
  company,
  upgradeRules,
}: QuoteBuilderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("setup");
  const [error, setError] = useState<string | null>(null);
  const [quoteId, setQuoteId] = useState(quote?.id ?? "");
  const [status, setStatus] = useState(quote?.status ?? "draft");

  const [customerId, setCustomerId] = useState(quote?.customer_id ?? "");
  const [jobAddress, setJobAddress] = useState(quote?.job_address ?? "");
  const [beforePhotos, setBeforePhotos] = useState<string[]>(
    quote?.before_photos ?? [],
  );

  const [rooms, setRooms] = useState<RoomInput[]>(
    initialRooms.map((r) => ({
      id: r.id,
      name: r.name,
      surface_type: r.surface_type,
      condition: r.condition,
      sq_ft: r.sq_ft,
      color_codes: r.color_codes,
      coats: r.coats,
      prep_work: r.prep_work,
    })),
  );

  const [lineItems, setLineItems] = useState<LineItemInput[]>(
    initialLineItems.map((item) => ({
      id: item.id,
      type: item.type,
      description: item.description,
      qty: item.qty,
      unit_cost: item.unit_cost,
      markup: item.markup,
    })),
  );

  const pricingSummary = useMemo(
    () => getCompanyPricingSummary(company),
    [company],
  );

  const subtotal = useMemo(
    () =>
      lineItemsSubtotal(
        lineItems.map((item, i) => ({
          id: item.id ?? `temp-${i}`,
          quote_id: quoteId,
          type: item.type,
          description: item.description,
          qty: item.qty,
          unit_cost: item.unit_cost,
          markup: item.markup,
        })),
      ),
    [lineItems, quoteId],
  );

  const quoteTotals = useMemo(
    () => calculateQuoteTotals(subtotal, company),
    [subtotal, company],
  );

  const tierBase = quoteTotals.beforeTax;

  const autoTierPrices = useMemo(
    () =>
      calculateTierPrices(
        tierBase,
        upgradeRules,
        company.default_margins as Record<string, number>,
      ),
    [tierBase, upgradeRules, company.default_margins],
  );

  const [tierState, setTierState] = useState<Record<QuoteTierName, TierInput>>(
    () => {
      const state = {} as Record<QuoteTierName, TierInput>;
      TIER_NAMES.forEach((tier) => {
        const existing = initialTiers.find((t) => t.tier === tier);
        const auto = autoTierPrices[tier];
        state[tier] = {
          tier,
          price: existing?.price ?? auto.price,
          margin: existing?.margin ?? auto.margin,
          features: existing?.features?.length
            ? existing.features
            : TIER_DEFAULTS[tier].features,
          benefits: existing?.benefits?.length
            ? existing.benefits
            : TIER_DEFAULTS[tier].benefits,
        };
      });
      return state;
    },
  );

  const [roomDrawerOpen, setRoomDrawerOpen] = useState(false);
  const [lineItemDrawerOpen, setLineItemDrawerOpen] = useState(false);
  const [editingRoomIndex, setEditingRoomIndex] = useState<number | null>(null);
  const [editingLineItemIndex, setEditingLineItemIndex] = useState<
    number | null
  >(null);
  const [roomDraft, setRoomDraft] = useState<RoomInput>(EMPTY_ROOM);
  const [lineItemDraft, setLineItemDraft] =
    useState<LineItemInput>(EMPTY_LINE_ITEM);

  const coverage = company.coverage_sqft_per_gallon || 350;
  const stepIndex = STEPS.indexOf(step);

  const ensureQuote = useCallback(async (): Promise<string | null> => {
    if (quoteId) return quoteId;
    if (!customerId || !jobAddress.trim()) {
      setError("Select a customer and enter a job address.");
      return null;
    }

    const result = await createQuote({
      customer_id: customerId,
      job_address: jobAddress.trim(),
      before_photos: beforePhotos,
    });

    if (!result.success) {
      setError(result.error);
      return null;
    }

    setQuoteId(result.data.id);
    router.replace(`/app/quotes/${result.data.id}`);
    return result.data.id;
  }, [quoteId, customerId, jobAddress, beforePhotos, router, company.id]);

  const saveSetup = async () => {
    setError(null);
    const id = await ensureQuote();
    if (!id) return false;

    const result = await updateQuote(id, {
      customer_id: customerId,
      job_address: jobAddress.trim(),
      before_photos: beforePhotos,
    });

    if (!result.success) {
      setError(result.error);
      return false;
    }
    return true;
  };

  const handleNext = () => {
    startTransition(async () => {
      setError(null);
      if (step === "setup") {
        const ok = await saveSetup();
        if (ok) setStep("estimator");
        return;
      }
      if (step === "estimator") {
        const id = await ensureQuote();
        if (!id) return;
        const result = await saveRooms(id, rooms);
        if (!result.success) {
          setError(result.error);
          return;
        }
        if (!lineItems.length && rooms.length) {
          setLineItems(buildLineItemsFromRooms(rooms, company));
        }
        setStep("line-items");
        return;
      }
      if (step === "line-items") {
        const id = await ensureQuote();
        if (!id) return;
        const result = await saveLineItems(id, lineItems);
        if (!result.success) {
          setError(result.error);
          return;
        }
        setStep("tiers");
        return;
      }
      if (step === "tiers") {
        const id = await ensureQuote();
        if (!id) return;
        const tiersToSave = TIER_NAMES.map((tier) => tierState[tier]);
        const result = await saveTiers(id, tiersToSave);
        if (!result.success) {
          setError(result.error);
          return;
        }
        setStep("review");
      }
    });
  };

  const handleBack = () => {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev);
  };

  const openRoomDrawer = (index: number | null = null) => {
    if (index !== null) {
      setRoomDraft(rooms[index]);
      setEditingRoomIndex(index);
    } else {
      setRoomDraft({ ...EMPTY_ROOM });
      setEditingRoomIndex(null);
    }
    setRoomDrawerOpen(true);
  };

  const saveRoomDraft = () => {
    if (!roomDraft.name.trim()) return;
    if (editingRoomIndex !== null) {
      setRooms((prev) =>
        prev.map((room, i) => (i === editingRoomIndex ? roomDraft : room)),
      );
    } else {
      setRooms((prev) => [...prev, roomDraft]);
    }
    setRoomDrawerOpen(false);
  };

  const openLineItemDrawer = (index: number | null = null) => {
    if (index !== null) {
      setLineItemDraft(lineItems[index]);
      setEditingLineItemIndex(index);
    } else {
      setLineItemDraft({
        ...EMPTY_LINE_ITEM,
        markup: pricingSummary.materialMarkup,
      });
      setEditingLineItemIndex(null);
    }
    setLineItemDrawerOpen(true);
  };

  const generateFromRooms = () => {
    if (!rooms.length) {
      setError("Add rooms in the estimator before generating line items.");
      return;
    }

    setLineItems(buildLineItemsFromRooms(rooms, company));
    setError(null);
  };

  const saveLineItemDraft = () => {
    if (!lineItemDraft.description.trim()) return;
    if (editingLineItemIndex !== null) {
      setLineItems((prev) =>
        prev.map((item, i) =>
          i === editingLineItemIndex ? lineItemDraft : item,
        ),
      );
    } else {
      setLineItems((prev) => [...prev, lineItemDraft]);
    }
    setLineItemDrawerOpen(false);
  };

  const applyAutoPricing = () => {
    setTierState((prev) => {
      const next = { ...prev };
      TIER_NAMES.forEach((tier) => {
        next[tier] = {
          ...next[tier],
          price: autoTierPrices[tier].price,
          margin: autoTierPrices[tier].margin,
        };
      });
      return next;
    });
  };

  const handleSendQuote = () => {
    startTransition(async () => {
      setError(null);
      const id = await ensureQuote();
      if (!id) return;

      const tiersToSave = TIER_NAMES.map((tier) => tierState[tier]);
      await saveTiers(id, tiersToSave);

      const result = await sendQuote(id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setStatus("sent");
      toast.success("Quote sent to customer.");
    });
  };

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const portalUrl =
    quoteId && company.slug && selectedCustomer?.portal_token
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/${company.slug}/quotes/${quoteId}?portal_token=${selectedCustomer.portal_token}`
      : null;

  const handleCopyPortalLink = async () => {
    if (!portalUrl) {
      toast.error("Save the quote and select a customer first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(portalUrl);
      toast.success("Customer portal link copied.");
    } catch {
      toast.error("Could not copy link.");
    }
  };

  const handleDuplicateQuote = () => {
    if (!quoteId) return;

    startTransition(async () => {
      const result = await duplicateQuote(quoteId);
      if (!result.success) {
        setError(result.error);
        toast.error(result.error ?? "Failed to duplicate quote.");
        return;
      }

      toast.success("Quote duplicated.");
      router.push(`/app/quotes/${result.data!.id}`);
    });
  };

  const totalGallons = rooms.reduce(
    (sum, room) =>
      sum + estimateGallons(room.sq_ft, room.coats, coverage),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="type-eyebrow">Quote Builder</p>
          <h1 className="font-display mt-1 text-2xl text-white sm:text-3xl">
            {mode === "create" ? "New Quote" : "Edit Quote"}
          </h1>
        </div>
        {status !== "draft" ? (
          <Badge variant={status === "accepted" ? "default" : "secondary"}>
            {status}
          </Badge>
        ) : null}
      </div>

      <Tabs value={step} onValueChange={(v) => setStep(v as Step)}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-5">
          <TabsTrigger value="setup" className="text-xs sm:text-sm">
            Setup
          </TabsTrigger>
          <TabsTrigger value="estimator" className="text-xs sm:text-sm">
            Estimator
          </TabsTrigger>
          <TabsTrigger value="line-items" className="text-xs sm:text-sm">
            Line Items
          </TabsTrigger>
          <TabsTrigger value="tiers" className="text-xs sm:text-sm">
            Tiers
          </TabsTrigger>
          <TabsTrigger value="review" className="text-xs sm:text-sm">
            Review
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Setup</CardTitle>
              <CardDescription>
                Choose the customer and job details for this quote.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger id="customer">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="job-address">Job Address</Label>
                <Input
                  id="job-address"
                  value={jobAddress}
                  onChange={(e) => setJobAddress(e.target.value)}
                  placeholder="123 Main St, City, ST"
                />
              </div>

              <PhotoGalleryUpload
                photos={beforePhotos}
                onChange={setBeforePhotos}
                quoteId={quoteId || undefined}
                label="Before photos"
                description="Upload photos of the job site before work begins."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estimator" className="mt-6 space-y-4">
          <Card className="border-border/60 bg-muted/20">
            <CardContent className="flex flex-wrap gap-x-6 gap-y-2 py-4 text-sm text-muted-foreground">
              <span>
                Painter: {formatCurrency(pricingSummary.painterRate)}/hr
              </span>
              <span>Prep: {formatCurrency(pricingSummary.prepRate)}/hr</span>
              <span>Materials: +{pricingSummary.materialMarkup}% markup</span>
              <span>Overhead: {pricingSummary.overheadPct}%</span>
              <span>Tax: {pricingSummary.taxRate}%</span>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Rooms</h2>
              <p className="text-sm text-muted-foreground">
                {totalGallons} gallons estimated · {coverage} sq ft/gal coverage
              </p>
            </div>
            <Button size="sm" onClick={() => openRoomDrawer()}>
              <Plus className="h-4 w-4" />
              Add Room
            </Button>
          </div>

          {rooms.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No rooms yet. Add rooms to estimate paint quantities.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {rooms.map((room, index) => {
                const gallons = estimateGallons(
                  room.sq_ft,
                  room.coats,
                  coverage,
                );
                return (
                  <Card key={`${room.name}-${index}`}>
                    <CardContent className="flex items-start justify-between gap-4 p-4">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-semibold text-foreground">
                          {room.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {room.sq_ft} sq ft · {room.coats} coats · {gallons}{" "}
                          gallons
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {room.surface_type} · {room.condition}
                          {room.color_codes ? ` · ${room.color_codes}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openRoomDrawer(index)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setRooms((prev) =>
                              prev.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="line-items" className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Line Items
              </h2>
              <p className="text-sm text-muted-foreground">
                Direct costs: {formatCurrency(subtotal)} · With overhead:{" "}
                {formatCurrency(quoteTotals.beforeTax)}
                {quoteTotals.tax > 0
                  ? ` · Total w/ tax: ${formatCurrency(quoteTotals.total)}`
                  : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={generateFromRooms}
                disabled={!rooms.length}
              >
                Generate from rooms
              </Button>
              <Button size="sm" onClick={() => openLineItemDrawer()}>
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </div>
          </div>

          {lineItems.length === 0 ? (
            <Card>
              <CardContent className="space-y-4 py-10 text-center text-muted-foreground">
                <p>
                  Add labor, materials, and extras — or generate from your room
                  estimates using company pricing defaults.
                </p>
                {rooms.length ? (
                  <Button variant="outline" onClick={generateFromRooms}>
                    Generate from rooms
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {lineItems.map((item, index) => {
                const lineTotal =
                  item.qty * item.unit_cost * (1 + item.markup / 100);
                return (
                  <Card key={`${item.description}-${index}`}>
                    <CardContent className="flex items-start justify-between gap-4 p-4">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {item.type}
                          </Badge>
                          <p className="font-semibold text-foreground">
                            {item.description}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.qty} × {formatCurrency(item.unit_cost)} +{" "}
                          {item.markup}% markup = {formatCurrency(lineTotal)}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openLineItemDrawer(index)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setLineItems((prev) =>
                              prev.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tiers" className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Tier base (costs + {pricingSummary.overheadPct}% overhead):{" "}
              {formatCurrency(tierBase)}
            </p>
            <Button variant="outline" size="sm" onClick={applyAutoPricing}>
              Apply Auto Pricing
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {TIER_NAMES.map((tier) => (
              <Card key={tier}>
                <CardHeader className="pb-3">
                  <CardTitle>{TIER_LABELS[tier]}</CardTitle>
                  <CardDescription>
                    Auto: {formatCurrency(autoTierPrices[tier].price)} ·{" "}
                    {autoTierPrices[tier].margin}% margin
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Price</Label>
                      <Input
                        type="number"
                        value={tierState[tier].price}
                        onChange={(e) =>
                          setTierState((prev) => ({
                            ...prev,
                            [tier]: {
                              ...prev[tier],
                              price: Number(e.target.value),
                              margin:
                                tierBase > 0
                                  ? Math.round(
                                      ((Number(e.target.value) - tierBase) /
                                        Number(e.target.value)) *
                                        1000,
                                    ) / 10
                                  : 0,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Margin %</Label>
                      <Input
                        type="number"
                        value={tierState[tier].margin}
                        readOnly
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Features (one per line)</Label>
                    <Textarea
                      rows={3}
                      value={joinLines(tierState[tier].features)}
                      onChange={(e) =>
                        setTierState((prev) => ({
                          ...prev,
                          [tier]: {
                            ...prev[tier],
                            features: parseLines(e.target.value),
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Benefits (one per line)</Label>
                    <Textarea
                      rows={3}
                      value={joinLines(tierState[tier].benefits)}
                      onChange={(e) =>
                        setTierState((prev) => ({
                          ...prev,
                          [tier]: {
                            ...prev[tier],
                            benefits: parseLines(e.target.value),
                          },
                        }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="review" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quote Summary</CardTitle>
              <CardDescription>
                Review margins and share with your customer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 rounded-lg border border-border bg-muted/20 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Direct costs</p>
                  <p className="font-semibold text-foreground">
                    {formatCurrency(quoteTotals.subtotal)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Overhead</p>
                  <p className="font-semibold text-foreground">
                    {formatCurrency(quoteTotals.overhead)}
                  </p>
                </div>
                {quoteTotals.tax > 0 ? (
                  <div>
                    <p className="text-muted-foreground">Tax</p>
                    <p className="font-semibold text-foreground">
                      {formatCurrency(quoteTotals.tax)}
                    </p>
                  </div>
                ) : null}
                <div>
                  <p className="text-muted-foreground">All-in total</p>
                  <p className="font-semibold text-foreground">
                    {formatCurrency(quoteTotals.total)}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {TIER_NAMES.map((tier) => (
                  <div
                    key={tier}
                    className="rounded-lg border border-border bg-muted/30 p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {TIER_LABELS[tier]}
                    </p>
                    <p className="type-stat-value mt-1 text-2xl">
                      {formatCurrency(tierState[tier].price)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tierState[tier].margin}% margin
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {quoteId ? (
                  <Button variant="outline" asChild>
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
                {portalUrl && status !== "draft" ? (
                  <Button variant="outline" onClick={handleCopyPortalLink}>
                    <Copy className="h-4 w-4" />
                    Copy portal link
                  </Button>
                ) : null}
                {quoteId && mode === "edit" ? (
                  <Button
                    variant="outline"
                    onClick={handleDuplicateQuote}
                    disabled={isPending}
                  >
                    <CopyPlus className="h-4 w-4" />
                    Duplicate quote
                  </Button>
                ) : null}
                <Button onClick={handleSendQuote} disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send Quote
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={stepIndex === 0 || isPending}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        {step !== "review" ? (
          <Button onClick={handleNext} disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Save & Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        ) : null}
      </div>

      <AppDrawer
        open={roomDrawerOpen}
        onOpenChange={setRoomDrawerOpen}
        title={editingRoomIndex !== null ? "Edit Room" : "Add Room"}
        description="Estimate paint needs for this room."
        footer={
          <Button className="w-full" onClick={saveRoomDraft}>
            Save Room
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Room Name</Label>
            <Input
              value={roomDraft.name}
              onChange={(e) =>
                setRoomDraft((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Living Room"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Surface Type</Label>
              <Select
                value={roomDraft.surface_type}
                onValueChange={(v) =>
                  setRoomDraft((prev) => ({ ...prev, surface_type: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="drywall">Drywall</SelectItem>
                  <SelectItem value="plaster">Plaster</SelectItem>
                  <SelectItem value="wood">Wood</SelectItem>
                  <SelectItem value="brick">Brick</SelectItem>
                  <SelectItem value="exterior">Exterior</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select
                value={roomDraft.condition}
                onValueChange={(v) =>
                  setRoomDraft((prev) => ({ ...prev, condition: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Square Feet</Label>
              <Input
                type="number"
                value={roomDraft.sq_ft || ""}
                onChange={(e) =>
                  setRoomDraft((prev) => ({
                    ...prev,
                    sq_ft: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Coats</Label>
              <Input
                type="number"
                min={1}
                value={roomDraft.coats}
                onChange={(e) =>
                  setRoomDraft((prev) => ({
                    ...prev,
                    coats: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>
          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            Estimated:{" "}
            <strong className="text-foreground">
              {estimateGallons(roomDraft.sq_ft, roomDraft.coats, coverage)}{" "}
              gallons
            </strong>
          </div>
          <div className="space-y-2">
            <Label>Color Codes</Label>
            <Input
              value={roomDraft.color_codes}
              onChange={(e) =>
                setRoomDraft((prev) => ({
                  ...prev,
                  color_codes: e.target.value,
                }))
              }
              placeholder="SW 7008, BM OC-17"
            />
          </div>
          <div className="space-y-2">
            <Label>Prep Work</Label>
            <Textarea
              value={roomDraft.prep_work}
              onChange={(e) =>
                setRoomDraft((prev) => ({ ...prev, prep_work: e.target.value }))
              }
              rows={3}
            />
          </div>
        </div>
      </AppDrawer>

      <AppDrawer
        open={lineItemDrawerOpen}
        onOpenChange={setLineItemDrawerOpen}
        title={editingLineItemIndex !== null ? "Edit Line Item" : "Add Line Item"}
        description="Labor, materials, or extra charges."
        footer={
          <Button className="w-full" onClick={saveLineItemDraft}>
            Save Item
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={lineItemDraft.type}
              onValueChange={(v) =>
                setLineItemDraft((prev) => ({
                  ...prev,
                  type: v as LineItemType,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="labor">Labor</SelectItem>
                <SelectItem value="material">Material</SelectItem>
                <SelectItem value="extra">Extra</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={lineItemDraft.description}
              onChange={(e) =>
                setLineItemDraft((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Interior wall painting"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Qty</Label>
              <Input
                type="number"
                value={lineItemDraft.qty}
                onChange={(e) =>
                  setLineItemDraft((prev) => ({
                    ...prev,
                    qty: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Unit Cost</Label>
              <Input
                type="number"
                value={lineItemDraft.unit_cost}
                onChange={(e) =>
                  setLineItemDraft((prev) => ({
                    ...prev,
                    unit_cost: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Markup %</Label>
              <Input
                type="number"
                value={lineItemDraft.markup}
                onChange={(e) =>
                  setLineItemDraft((prev) => ({
                    ...prev,
                    markup: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>
        </div>
      </AppDrawer>
    </div>
  );
}