"use client";

import {
  NextIntlClientProvider,
  type AbstractIntlMessages,
} from "next-intl";

/** Client island wrapper so `useTranslations` works when a server page streams. */
export function ClientIntl({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: AbstractIntlMessages;
  children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone="America/Chicago"
    >
      {children}
    </NextIntlClientProvider>
  );
}
