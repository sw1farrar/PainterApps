"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addArea,
  addSurface,
  deleteArea,
  deleteSurface,
  saveEstimateCustomer,
  setEstimateStatus,
  updateArea,
  updateEstimateMeta,
  updateSurface,
} from "@/app/app/estimates/actions";
import { rateIdsForTemplate } from "@/lib/estimates/templates";
import type {
  LetterArea,
  LetterCompany,
  LetterCustomer,
  LetterEstimate,
  LetterSurface,
} from "@/lib/estimates/letter";
import { formatMoney } from "@/lib/estimates/letter";
import { LetterDocument, letterLabels } from "@/components/estimates/LetterDocument";
import { EmailEstimateDialog } from "@/components/estimates/EmailEstimateDialog";

export type { LetterArea, LetterCustomer, LetterEstimate, LetterSurface };

export type LetterRate = {
  id: string;
  category: string;
  name: string;
  unit: string;
};

type Modal =
  | { type: "room"; area?: LetterArea }
  | { type: "surface"; area: LetterArea; surface?: LetterSurface }
  | { type: "customer" }
  | { type: "letterhead" }
  | { type: "email" }
  | null;

function money(n: number) {
  return formatMoney(n);
}

export function EstimateLetter({
  estimate,
  areas,
  customer,
  customers,
  company,
  rates,
  showHours,
  editable,
  emailConfigured = true,
}: {
  estimate: LetterEstimate;
  areas: LetterArea[];
  customer: LetterCustomer | null;
  customers: LetterCustomer[];
  company: LetterCompany;
  rates: LetterRate[];
  showHours: boolean;
  editable: boolean;
  emailConfigured?: boolean;
}) {
  const t = useTranslations("app");
  const [modal, setModal] = useState<Modal>(null);
  const labels = letterLabels(t, company.proposal_valid_days);

  return (
    <div>
      {editable ? (
        <div className="no-print mb-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setModal({ type: "email" })}
          >
            {t("emailEstimate")}
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`/app/estimates/${estimate.id}/print`}>{t("letterPreview")}</a>
          </Button>
          {estimate.status !== "sent" ? (
            <form action={setEstimateStatus}>
              <input type="hidden" name="estimate_id" value={estimate.id} />
              <input type="hidden" name="status" value="sent" />
              <Button type="submit" size="sm" variant="outline">
                {t("markSent")}
              </Button>
            </form>
          ) : null}
          {estimate.status !== "accepted" ? (
            <form action={setEstimateStatus}>
              <input type="hidden" name="estimate_id" value={estimate.id} />
              <input type="hidden" name="status" value="accepted" />
              <Button type="submit" size="sm" variant="outline">
                {t("markAccepted")}
              </Button>
            </form>
          ) : null}
          <span className="text-sm text-muted-foreground">
            {t(
              estimate.status === "sent"
                ? "statusSent"
                : estimate.status === "accepted"
                  ? "statusAccepted"
                  : estimate.status === "declined"
                    ? "statusDeclined"
                    : "statusDraft",
            )}
          </span>
        </div>
      ) : null}

      <div className={editable ? "shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)]" : undefined}>
        <LetterDocument
          estimate={estimate}
          areas={areas}
          customer={customer}
          company={company}
          showHours={showHours}
          labels={labels}
          onLetterheadClick={editable ? () => setModal({ type: "letterhead" }) : undefined}
          onCustomerClick={editable ? () => setModal({ type: "customer" }) : undefined}
          onRoomClick={editable ? (area) => setModal({ type: "room", area }) : undefined}
          onSurfaceClick={
            editable
              ? (area, surface) => setModal({ type: "surface", area, surface })
              : undefined
          }
          onAddRoom={editable ? () => setModal({ type: "room" }) : undefined}
          onAddSurface={
            editable ? (area) => setModal({ type: "surface", area }) : undefined
          }
        />
      </div>

      {editable && modal?.type === "room" ? (
        <RoomModal
          estimateId={estimate.id}
          area={modal.area}
          rates={rates}
          onClose={() => setModal(null)}
        />
      ) : null}
      {editable && modal?.type === "surface" ? (
        <SurfaceModal
          estimateId={estimate.id}
          area={modal.area}
          surface={modal.surface}
          rates={rates}
          hourly={Number(estimate.hourly_rate_snapshot)}
          onClose={() => setModal(null)}
        />
      ) : null}
      {editable && modal?.type === "customer" ? (
        <CustomerModal
          estimateId={estimate.id}
          customer={customer}
          customers={customers}
          onClose={() => setModal(null)}
        />
      ) : null}
      {editable && modal?.type === "letterhead" ? (
        <LetterheadModal
          estimateId={estimate.id}
          zip={estimate.zip}
          hourly={Number(estimate.hourly_rate_snapshot)}
          notes={estimate.notes}
          onClose={() => setModal(null)}
        />
      ) : null}
      {editable && modal?.type === "email" ? (
        <EmailEstimateDialog
          estimate={estimate}
          areas={areas}
          customer={customer}
          company={company}
          showHours={showHours}
          emailConfigured={emailConfigured}
          onClose={() => setModal(null)}
          onPickCustomer={() => setModal({ type: "customer" })}
        />
      ) : null}
    </div>
  );
}

function RoomModal({
  estimateId,
  area,
  rates,
  onClose,
}: {
  estimateId: string;
  area?: LetterArea;
  rates: LetterRate[];
  onClose: () => void;
}) {
  const t = useTranslations("app");
  const [template, setTemplate] = useState("");
  const rateIds = useMemo(
    () => (template ? rateIdsForTemplate(template, rates).join(",") : ""),
    [template, rates],
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{area ? t("editRoom") : t("addRoom")}</DialogTitle>
        </DialogHeader>
        <form action={area ? updateArea : addArea} className="space-y-3">
          <input type="hidden" name="estimate_id" value={estimateId} />
          {area ? <input type="hidden" name="area_id" value={area.id} /> : null}
          {!area ? (
            <>
              <input type="hidden" name="rate_ids" value={rateIds} />
            </>
          ) : null}
          <div>
            <Label htmlFor="area-name">{t("areaName")}</Label>
            <Input
              id="area-name"
              name="name"
              required
              defaultValue={area?.name ?? ""}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="area-kind">{t("room")}</Label>
            <select
              id="area-kind"
              name="kind"
              defaultValue={area?.kind ?? "room"}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="room">{t("room")}</option>
              <option value="surface">{t("surface")}</option>
            </select>
          </div>
          {!area ? (
            <div>
              <Label htmlFor="template">{t("template")}</Label>
              <select
                id="template"
                name="template"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">{t("templateNone")}</option>
                <option value="bedroom">{t("templateBedroom")}</option>
                <option value="bathroom">{t("templateBathroom")}</option>
                <option value="kitchen">{t("templateKitchen")}</option>
                <option value="living">{t("templateLiving")}</option>
                <option value="exterior">{t("templateExterior")}</option>
              </select>
            </div>
          ) : null}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="length">{t("length")}</Label>
              <Input
                id="length"
                name="length"
                type="number"
                step="0.1"
                required
                defaultValue={area?.length || ""}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="width">{t("width")}</Label>
              <Input
                id="width"
                name="width"
                type="number"
                step="0.1"
                defaultValue={area?.width || ""}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="height">{t("height")}</Label>
              <Input
                id="height"
                name="height"
                type="number"
                step="0.1"
                defaultValue={area?.height || 8}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="openings">{t("openings")}</Label>
            <Input
              id="openings"
              name="opening_sqft"
              type="number"
              step="0.1"
              defaultValue={area?.opening_sqft || ""}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            {area ? (
              <Button formAction={deleteArea} type="submit" variant="ghost">
                {t("delete")}
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit">{t("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SurfaceModal({
  estimateId,
  area,
  surface,
  rates,
  hourly,
  onClose,
}: {
  estimateId: string;
  area: LetterArea;
  surface?: LetterSurface;
  rates: LetterRate[];
  hourly: number;
  onClose: () => void;
}) {
  const t = useTranslations("app");
  const [rateId, setRateId] = useState(surface?.rate_id ?? rates[0]?.id ?? "");
  const [coats, setCoats] = useState(String(surface?.coats ?? 2));
  const groups = useMemo(() => {
    const map = new Map<string, LetterRate[]>();
    for (const r of rates) {
      const list = map.get(r.category) ?? [];
      list.push(r);
      map.set(r.category, list);
    }
    return [...map.entries()];
  }, [rates]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{surface ? t("editSurface") : t("addSurface")}</DialogTitle>
        </DialogHeader>
        <form action={surface ? updateSurface : addSurface} className="space-y-3">
          <input type="hidden" name="estimate_id" value={estimateId} />
          <input type="hidden" name="area_id" value={area.id} />
          {surface ? <input type="hidden" name="surface_id" value={surface.id} /> : null}
          <div>
            <Label htmlFor="rate">{t("chooseRate")}</Label>
            <select
              id="rate"
              name="rate_id"
              required
              value={rateId}
              onChange={(e) => setRateId(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {groups.map(([cat, list]) => (
                <optgroup key={cat} label={cat}>
                  {list.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="coats">{t("coats")}</Label>
            <select
              id="coats"
              name="coats"
              value={coats}
              onChange={(e) => setCoats(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="1">{t("coat1")}</option>
              <option value="2">{t("coat2")}</option>
              <option value="3">{t("coat3")}</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="qty">{t("qtyOverride")}</Label>
              <Input
                id="qty"
                name="qty"
                type="number"
                step="0.1"
                defaultValue={surface?.qty || ""}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="prep">{t("prepHours")}</Label>
              <Input
                id="prep"
                name="prep"
                type="number"
                step="0.1"
                defaultValue={surface?.hours_prep || ""}
                className="mt-1"
              />
            </div>
          </div>
          {surface && hourly ? (
            <p className="text-sm text-muted-foreground">
              {t("previewHours")}:{" "}
              {(Number(surface.hours_paint) + Number(surface.hours_prep)).toFixed(1)} ·{" "}
              {t("previewAmount")}: {money(Number(surface.amount))}
            </p>
          ) : null}
          <DialogFooter>
            {surface ? (
              <Button formAction={deleteSurface} type="submit" variant="ghost">
                {t("delete")}
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit">{t("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CustomerModal({
  estimateId,
  customer,
  customers,
  onClose,
}: {
  estimateId: string;
  customer: LetterCustomer | null;
  customers: LetterCustomer[];
  onClose: () => void;
}) {
  const t = useTranslations("app");
  const [mode, setMode] = useState<"pick" | "new">(
    customers.length ? "pick" : "new",
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("pickCustomer")}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            className={mode === "pick" ? "font-medium" : "text-muted-foreground"}
            onClick={() => setMode("pick")}
          >
            {t("pickCustomer")}
          </button>
          <button
            type="button"
            className={mode === "new" ? "font-medium" : "text-muted-foreground"}
            onClick={() => setMode("new")}
          >
            {t("newCustomer")}
          </button>
        </div>
        {mode === "pick" ? (
          <form action={saveEstimateCustomer} className="space-y-3">
            <input type="hidden" name="estimate_id" value={estimateId} />
            <select
              name="customer_id"
              defaultValue={customer?.id ?? ""}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">{t("walkIn")}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {t("cancel")}
              </Button>
              <Button type="submit">{t("save")}</Button>
            </DialogFooter>
          </form>
        ) : (
          <form action={saveEstimateCustomer} className="space-y-3">
            <input type="hidden" name="estimate_id" value={estimateId} />
            <Input name="name" placeholder={t("customerName")} required />
            <Input name="phone" placeholder={t("phone")} />
            <Input name="email" placeholder={t("email")} type="email" autoComplete="off" />
            <Input name="address" placeholder={t("address")} />
            <Input name="zip" placeholder={t("zip")} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {t("cancel")}
              </Button>
              <Button type="submit">{t("save")}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LetterheadModal({
  estimateId,
  zip,
  hourly,
  notes,
  onClose,
}: {
  estimateId: string;
  zip: string;
  hourly: number;
  notes: string;
  onClose: () => void;
}) {
  const t = useTranslations("app");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("letterhead")}</DialogTitle>
        </DialogHeader>
        <form action={updateEstimateMeta} className="space-y-3">
          <input type="hidden" name="estimate_id" value={estimateId} />
          <div>
            <Label htmlFor="zip">{t("zip")}</Label>
            <Input id="zip" name="zip" defaultValue={zip} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="hourly">{t("hourlyRate")}</Label>
            <Input
              id="hourly"
              name="hourly_rate"
              type="number"
              step="0.01"
              defaultValue={hourly}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="notes">{t("notes")}</Label>
            <Input id="notes" name="notes" defaultValue={notes} className="mt-1" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit">{t("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
