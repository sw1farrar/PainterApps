"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type QuoteEditorChromeContextValue = {
  headerDetail: ReactNode | null;
  setHeaderDetail: (detail: ReactNode | null) => void;
};

const QuoteEditorChromeContext =
  createContext<QuoteEditorChromeContextValue | null>(null);

export function QuoteEditorChromeProvider({ children }: { children: ReactNode }) {
  const [headerDetail, setHeaderDetailState] = useState<ReactNode | null>(null);

  const setHeaderDetail = useCallback((detail: ReactNode | null) => {
    setHeaderDetailState(detail);
  }, []);

  const value = useMemo(
    () => ({ headerDetail, setHeaderDetail }),
    [headerDetail, setHeaderDetail],
  );

  return (
    <QuoteEditorChromeContext.Provider value={value}>
      {children}
    </QuoteEditorChromeContext.Provider>
  );
}

export function useQuoteEditorChrome() {
  const context = useContext(QuoteEditorChromeContext);
  if (!context) {
    throw new Error(
      "useQuoteEditorChrome must be used within QuoteEditorChromeProvider",
    );
  }
  return context;
}

export function useOptionalQuoteEditorChrome() {
  return useContext(QuoteEditorChromeContext);
}