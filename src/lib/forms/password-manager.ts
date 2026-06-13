export type PasswordManagerFieldProps = {
  autoComplete?: string;
  "data-lpignore"?: string;
  "data-1p-ignore"?: string;
  "data-bwignore"?: string;
  "data-form-type"?: string;
};

export function getPasswordManagerIgnoreProps(
  autoComplete?: string,
): PasswordManagerFieldProps {
  return {
    autoComplete: autoComplete ?? "off",
    "data-lpignore": "true",
    "data-1p-ignore": "",
    "data-bwignore": "",
    "data-form-type": "other",
  };
}