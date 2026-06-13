"use client";

import * as React from "react";

const PasswordManagerContext = React.createContext(false);

export function useSuppressPasswordManager() {
  return React.useContext(PasswordManagerContext);
}

type PasswordManagerProviderProps = {
  suppress: boolean;
  children: React.ReactNode;
};

export function PasswordManagerProvider({
  suppress,
  children,
}: PasswordManagerProviderProps) {
  return (
    <PasswordManagerContext.Provider value={suppress}>
      {suppress ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
        >
          <input
            type="text"
            name="prevent_autofill"
            tabIndex={-1}
            autoComplete="off"
            readOnly
          />
          <input
            type="password"
            name="prevent_autofill_pw"
            tabIndex={-1}
            autoComplete="new-password"
            readOnly
          />
        </div>
      ) : null}
      {children}
    </PasswordManagerContext.Provider>
  );
}