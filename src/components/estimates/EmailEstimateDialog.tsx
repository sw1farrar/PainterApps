"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { sendEstimateEmail } from "@/app/app/estimates/actions";
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
import { Textarea } from "@/components/ui/textarea";
import { LetterDocument, letterLabels } from "@/components/estimates/LetterDocument";
import { formatMoney, type LetterArea, type LetterCompany, type LetterCustomer, type LetterEstimate } from "@/lib/estimates/letter";

function defaultBody(opts: {
  firstName: string;
  company: string;
  phone: string;
  viewLink: string;
  total: string;
}) {
  const hi = opts.firstName ? `Hi ${opts.firstName},` : "Hi,";
  const phone = opts.phone
    ? `Questions or changes — just reply to this email or call ${opts.phone}.`
    : "Questions or changes — just reply to this email.";
  return `${hi}

Here's the estimate we talked about for the paint work. Investment is ${opts.total}.

Open it here:
${opts.viewLink}

${phone}

Thanks,
${opts.company}`;
}

export function EmailEstimateDialog({
  estimate,
  areas,
  customer,
  company,
  showHours,
  emailConfigured,
  onClose,
  onPickCustomer,
}: {
  estimate: LetterEstimate;
  areas: LetterArea[];
  customer: LetterCustomer | null;
  company: LetterCompany;
  showHours: boolean;
  emailConfigured: boolean;
  onClose: () => void;
  onPickCustomer: () => void;
}) {
  const t = useTranslations("app");
  const shop = company.company_name || "PainterApps";
  const first = (customer?.name ?? "").split(" ")[0] ?? "";
  const origin =
    typeof window !== "undefined" && window.location.hostname !== "localhost"
      ? window.location.origin
      : "https://painterapps.com";
  const viewLink = `${origin}/e/${estimate.view_token ?? estimate.id}`;
  const total = formatMoney(Number(estimate.totals?.total ?? 0));
  const [to, setTo] = useState(customer?.email ?? "");
  const [subject, setSubject] = useState(
    `Estimate #${estimate.number} — ${shop}`,
  );
  const [body, setBody] = useState(
    defaultBody({
      firstName: first,
      company: shop,
      phone: company.phone,
      viewLink,
      total,
    }),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    setError("");
    if (!to.includes("@")) {
      setError(t("emailNeedAddress"));
      return;
    }
    setPending(true);
    const result = await sendEstimateEmail({
      estimateId: estimate.id,
      to,
      subject,
      body,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {t("emailEstimate")} · #{estimate.number}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]">
          <div className="space-y-3">
            {!emailConfigured ? (
              <p className="text-sm text-destructive">{t("emailNotConfigured")}</p>
            ) : null}
            {!customer ? (
              <p className="text-sm text-muted-foreground">
                {t("emailNoCustomer")}{" "}
                <button type="button" className="underline" onClick={onPickCustomer}>
                  {t("pickCustomer")}
                </button>
              </p>
            ) : !customer.email ? (
              <p className="text-sm text-muted-foreground">
                {t("emailSaveOnCustomer")}
              </p>
            ) : null}
            <div>
              <Label htmlFor="email-to">{t("emailTo")}</Label>
              <Input
                id="email-to"
                type="email"
                autoComplete="off"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email-subject">{t("emailSubject")}</Label>
              <Input
                id="email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email-body">{t("emailMessage")}</Label>
              <Textarea
                id="email-body"
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">{t("emailLinkNote")}</p>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <div className="hidden overflow-auto rounded-lg bg-neutral-200 p-3 md:block">
            <p className="mb-2 text-xs text-neutral-600">{t("emailPreviewCaption")}</p>
            <div className="origin-top scale-[0.72]">
              <LetterDocument
                estimate={estimate}
                areas={areas}
                customer={customer}
                company={company}
                showHours={showHours}
                labels={letterLabels(t, company.proposal_valid_days)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            type="button"
            disabled={pending || !emailConfigured}
            onClick={() => void send()}
          >
            {pending ? t("emailSending") : t("emailSend")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
