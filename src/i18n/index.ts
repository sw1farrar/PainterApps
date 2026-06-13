import { en } from "@/i18n/messages/en";
import { es } from "@/i18n/messages/es";
import { assertMessageParity } from "@/i18n/validate-messages";
import type { Locale, Messages } from "@/i18n/types";

export const messages: Record<Locale, Messages> = { en, es };

assertMessageParity(messages);

export { formatMessage } from "@/i18n/format";

export const defaultLocale: Locale = "en";

export const locales: Locale[] = ["en", "es"];