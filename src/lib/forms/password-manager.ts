export type PasswordManagerFieldProps = {
  autoComplete?: string;
  "data-lpignore"?: string;
  "data-lastpass-ignore"?: string;
  "data-lastpass-disable-search"?: string;
  "data-1p-ignore"?: string;
  "data-bwignore"?: string;
  "data-form-type"?: string;
};

export const PASSWORD_MANAGER_SHELL_PROPS = {
  "data-lpignore": "true",
  "data-lastpass-ignore": "true",
  "data-lastpass-disable-search": "true",
  "data-form-type": "other",
  autoComplete: "off",
} as const satisfies PasswordManagerFieldProps & { autoComplete: string };

export function getPasswordManagerIgnoreProps(): PasswordManagerFieldProps {
  return {
    autoComplete: "off",
    "data-lpignore": "true",
    "data-lastpass-ignore": "true",
    "data-lastpass-disable-search": "true",
    "data-1p-ignore": "",
    "data-bwignore": "",
    "data-form-type": "other",
  };
}

export function isCredentialFieldType(type?: string) {
  return type === "email" || type === "password";
}