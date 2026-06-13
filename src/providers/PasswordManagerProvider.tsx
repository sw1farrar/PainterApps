"use client";

import * as React from "react";

import { ExtensionBlocker } from "@/components/forms/ExtensionBlocker";
import { PASSWORD_MANAGER_SHELL_PROPS } from "@/lib/forms/password-manager";

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
            name="pa_decoy_x7k"
            tabIndex={-1}
            autoComplete="off"
            readOnly
          />
        </div>
      ) : null}
      <ExtensionBlocker active={suppress}>
        {suppress ? (
          <div className="portal-autofill-blocked" {...PASSWORD_MANAGER_SHELL_PROPS}>
            {children}
          </div>
        ) : (
          children
        )}
      </ExtensionBlocker>
    </PasswordManagerContext.Provider>
  );
}