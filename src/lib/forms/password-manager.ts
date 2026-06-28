export type PasswordManagerFieldProps = {
  autoComplete?: string;
  autoCapitalize?: string;
  autoCorrect?: string;
  spellCheck?: boolean;
  "data-lpignore"?: string;
  "data-lastpass-ignore"?: string;
  "data-lastpass-disable-search"?: string;
  "data-kwimpalastatus"?: string;
  "data-1p-ignore"?: string;
  "data-bwignore"?: string;
  "data-dashlane-ignore"?: string;
  "data-dashlane-disabled-on-field"?: string;
  "data-protonpass-ignore"?: string;
  "data-keeper-lock"?: string;
  "data-form-type"?: string;
};

export const EXTENSION_UI_SELECTORS = [
  "[data-lastpass-icon-root]",
  "[data-lastpass-root]",
  'div[id^="__lp"]',
  'iframe[src*="lastpass"]',
  "[class*='com-1password']",
  "[class*='OnePassword']",
  "bitwarden-field",
  "[data-dashlanecreated]",
  "#dashlane-infield-tooltip",
  "[data-protonpass-role]",
  "[data-keeper-root]",
  ".keeper-fill-interface",
].join(",");

export const PASSWORD_MANAGER_SHELL_PROPS = {
  "data-lpignore": "true",
  "data-lastpass-ignore": "true",
  "data-lastpass-disable-search": "true",
  "data-form-type": "other",
  autoComplete: "off",
} as const satisfies PasswordManagerFieldProps & { autoComplete: string };

/** Applied to document.body while password managers are suppressed site-wide. */
export const PASSWORD_MANAGER_BODY_PROPS = {
  "data-pm-suppress": "true",
  "data-lpignore": "true",
  "data-lastpass-ignore": "true",
  "data-lastpass-disable-search": "true",
} as const;

/** Routes where password managers (LastPass, etc.) may run normally. */
export const PASSWORD_MANAGER_ALLOWED_PATHS = ["/login"] as const;

export function isPasswordManagerAllowedPath(pathname: string) {
  return PASSWORD_MANAGER_ALLOWED_PATHS.some(
    (allowed) => pathname === allowed || pathname.startsWith(`${allowed}/`),
  );
}

export const PASSWORD_MANAGER_LOGIN_FORM_PROPS = {
  autoComplete: "on",
  "data-form-type": "login",
} as const;

export const PASSWORD_MANAGER_LOGIN_USERNAME_PROPS = {
  autoComplete: "username",
  "data-form-type": "login",
} as const;

export const PASSWORD_MANAGER_LOGIN_PASSWORD_PROPS = {
  autoComplete: "current-password",
  "data-form-type": "login",
} as const;

export function getPasswordManagerIgnoreProps(): PasswordManagerFieldProps {
  return {
    autoComplete: "one-time-code",
    autoCapitalize: "off",
    autoCorrect: "off",
    spellCheck: false,
    "data-lpignore": "true",
    "data-lastpass-ignore": "true",
    "data-lastpass-disable-search": "true",
    "data-kwimpalastatus": "dead",
    "data-1p-ignore": "",
    "data-bwignore": "",
    "data-dashlane-ignore": "true",
    "data-dashlane-disabled-on-field": "true",
    "data-protonpass-ignore": "true",
    "data-keeper-lock": "true",
    "data-form-type": "other",
  };
}

export function isCredentialFieldType(type?: string) {
  return type === "email" || type === "password";
}

const CREDENTIAL_PATTERN = /email|password|username|login|user/i;

export function sanitizeCredentialFieldId(id?: string) {
  if (!id || !CREDENTIAL_PATTERN.test(id)) return id;
  return id.replace(/email/gi, "contact").replace(/password/gi, "secret");
}

export function sanitizeCredentialFieldName(name?: string) {
  if (!name || !CREDENTIAL_PATTERN.test(name)) return name;
  return undefined;
}