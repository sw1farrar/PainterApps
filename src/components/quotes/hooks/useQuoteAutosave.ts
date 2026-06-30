"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  saveQuoteDraft,
  type QuoteDraftInput,
} from "@/app/app/(portal)/quotes/actions";
import { serializeQuoteDraftForCompare } from "@/lib/quotes/draft-serialize";
import { enqueueQuoteSave } from "@/lib/quotes/save-coordinator";

export type AutosaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

type UseQuoteAutosaveOptions = {
  quoteId: string;
  enabled: boolean;
  draft: QuoteDraftInput;
  delayMs?: number;
  onSaved?: (savedPayload: string) => void | Promise<void>;
};

export function useQuoteAutosave({
  quoteId,
  enabled,
  draft,
  delayMs = 2000,
  onSaved,
}: UseQuoteAutosaveOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSerializedRef = useRef("");
  const draftRef = useRef(draft);
  const onSavedRef = useRef(onSaved);
  const flushSaveRef = useRef<() => Promise<void>>(async () => {});
  const baselineReadyRef = useRef(false);
  draftRef.current = draft;
  onSavedRef.current = onSaved;

  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const serialized = serializeQuoteDraftForCompare(draft);

  const hasPendingChanges =
    enabled &&
    Boolean(quoteId) &&
    baselineReadyRef.current &&
    serialized !== lastSavedSerializedRef.current;

  const markBaseline = useCallback((snapshot?: string) => {
    const next = snapshot ?? serializeQuoteDraftForCompare(draftRef.current);
    lastSavedSerializedRef.current = next;
    baselineReadyRef.current = true;
    setStatus("saved");
  }, []);

  const flushSave = useCallback(async () => {
    if (!quoteId || !enabled || !baselineReadyRef.current) return;

    const payload = serializeQuoteDraftForCompare(draftRef.current);
    if (payload === lastSavedSerializedRef.current) {
      setStatus("saved");
      return;
    }

    setStatus("saving");

    const result = await enqueueQuoteSave(async () =>
      saveQuoteDraft(quoteId, draftRef.current),
    );

    if (result.success) {
      setStatus("saved");
      setLastSavedAt(new Date());
      await onSavedRef.current?.(payload);
      const latest = serializeQuoteDraftForCompare(draftRef.current);
      lastSavedSerializedRef.current = latest;
      if (latest !== payload) {
        void flushSaveRef.current();
      }
    } else {
      setStatus("error");
      toast.error(result.error ?? "Autosave failed");
    }
  }, [enabled, quoteId]);

  flushSaveRef.current = flushSave;

  useEffect(() => {
    baselineReadyRef.current = false;
    lastSavedSerializedRef.current = "";
    setStatus(quoteId ? "saved" : "idle");
    setLastSavedAt(null);

    if (!quoteId || !enabled) return;

    let innerFrame = 0;
    const outerFrame = window.requestAnimationFrame(() => {
      innerFrame = window.requestAnimationFrame(() => {
        markBaseline();
      });
    });

    return () => {
      window.cancelAnimationFrame(outerFrame);
      if (innerFrame) window.cancelAnimationFrame(innerFrame);
    };
  }, [quoteId, enabled, markBaseline]);

  useEffect(() => {
    if (!enabled || !quoteId || !baselineReadyRef.current) {
      if (!quoteId) setStatus("idle");
      return;
    }
    if (serialized === lastSavedSerializedRef.current) {
      setStatus("saved");
      return;
    }

    setStatus("pending");

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      void flushSave();
    }, delayMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [serialized, enabled, quoteId, delayMs, flushSave]);

  useEffect(() => {
    if (!enabled || !quoteId) return;

    const flushOnLeave = () => {
      const payload = serializeQuoteDraftForCompare(draftRef.current);
      if (payload !== lastSavedSerializedRef.current) {
        void flushSaveRef.current();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushOnLeave();
      }
    };

    window.addEventListener("pagehide", flushOnLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", flushOnLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const payload = serializeQuoteDraftForCompare(draftRef.current);
      if (baselineReadyRef.current && payload !== lastSavedSerializedRef.current) {
        void flushSaveRef.current();
      }
    };
  }, [enabled, quoteId]);

  return { status, lastSavedAt, flushSave, hasPendingChanges, markBaseline };
}