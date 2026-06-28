"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { buildLoginHref, buildSignupHref } from "@/lib/auth/login-redirect";
import {
  getSellSheetAuthState,
  saveSellSheetForUser,
} from "@/lib/sell-sheet/actions";
import type { BenefitLibrary } from "@/lib/sell-sheet/benefit-library";
import type { SellSheetData } from "@/types/sell-sheet";

type SellSheetSaveModalProps = {
  open: boolean;
  onClose: () => void;
  getData: () => SellSheetData;
  getBenefitLibrary?: () => BenefitLibrary | undefined;
  sellSheetId?: string;
  loginReturnTo?: string;
  onBeforeLogin?: () => void;
  labels: {
    title: string;
    subtitle: string;
    fullName: string;
    companyName: string;
    email: string;
    phone: string;
    password: string;
    passwordHint: string;
    save: string;
    saving: string;
    cancel: string;
    signInInstead: string;
    createFreeAccount: string;
    loggedInTitle: string;
    loggedInSubtitle: string;
  };
  onSaved: (sellSheetId: string) => void;
};

export function SellSheetSaveModal({
  open,
  onClose,
  getData,
  getBenefitLibrary,
  sellSheetId,
  loginReturnTo = "/free-tools/build-sell-sheet",
  onBeforeLogin,
  labels,
  onSaved,
}: SellSheetSaveModalProps) {
  const loginHref = buildLoginHref(loginReturnTo);
  const signupHref = buildSignupHref(loginReturnTo);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;

    setError(null);

    getSellSheetAuthState().then((state) => {
      setIsLoggedIn(state.isLoggedIn);
    });
  }, [open]);

  if (!open) return null;

  const handleSignIn = () => {
    onBeforeLogin?.();
    onClose();
  };

  const handleSave = () => {
    setError(null);

    startTransition(async () => {
      const result = await saveSellSheetForUser(
        getData(),
        sellSheetId,
        getBenefitLibrary?.(),
      );
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSaved(result.data!.sellSheetId);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sell-sheet-save-title"
    >
      <div className="surface-form relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded p-1 text-silver-600 transition hover:bg-silver-100 hover:text-navy-900"
          aria-label={labels.cancel}
        >
          <X className="h-5 w-5" />
        </button>

        <h2
          id="sell-sheet-save-title"
          className="font-display text-2xl text-navy-900"
        >
          {isLoggedIn ? labels.loggedInTitle : labels.title}
        </h2>
        <p className="mt-2 text-sm text-silver-600">
          {isLoggedIn ? labels.loggedInSubtitle : labels.subtitle}
        </p>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
            {error.includes("already exists") ? (
              <>
                {" "}
                <a
                  href={loginHref}
                  onClick={handleSignIn}
                  className="font-semibold underline"
                >
                  {labels.signInInstead}
                </a>
              </>
            ) : null}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-outline-dark px-5 py-2.5 text-sm"
            disabled={isPending}
          >
            {labels.cancel}
          </button>
          {isLoggedIn ? (
            <button
              type="button"
              onClick={handleSave}
              className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {labels.saving}
                </>
              ) : (
                labels.save
              )}
            </button>
          ) : (
            <>
              <a
                href={signupHref}
                onClick={handleSignIn}
                className="btn-primary inline-flex items-center px-5 py-2.5 text-sm"
              >
                {labels.createFreeAccount}
              </a>
              <a
                href={loginHref}
                onClick={handleSignIn}
                className="btn-outline-dark inline-flex items-center px-5 py-2.5 text-sm"
              >
                {labels.signInInstead}
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}