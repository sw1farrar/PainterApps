"use client";

import { X } from "lucide-react";

type SellSheetEditorModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  doneLabel: string;
  size?: "default" | "large";
  children: React.ReactNode;
};

export function SellSheetEditorModal({
  open,
  onClose,
  title,
  subtitle,
  doneLabel,
  size = "default",
  children,
}: SellSheetEditorModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sell-sheet-editor-modal-title"
      onClick={onClose}
    >
      <div
        className={`surface-form relative flex max-h-[92vh] w-full flex-col rounded-t-xl shadow-2xl sm:max-h-[90vh] sm:rounded-xl ${
          size === "large" ? "max-w-6xl" : "max-w-4xl"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-silver-300/60 px-5 py-4 sm:px-8 sm:py-5">
          <div className="min-w-0">
            <h2
              id="sell-sheet-editor-modal-title"
              className="font-display text-xl text-navy-900 sm:text-2xl"
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-silver-600">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1 text-silver-600 transition hover:bg-silver-100 hover:text-navy-900"
            aria-label={doneLabel}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-8 sm:py-6">
          {children}
        </div>

        <div className="flex shrink-0 justify-end border-t border-silver-300/60 px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="btn-primary px-6 py-2.5 text-sm"
          >
            {doneLabel}
          </button>
        </div>
      </div>
    </div>
  );
}