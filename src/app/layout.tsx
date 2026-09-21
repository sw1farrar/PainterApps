import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { getLocale, getMessages } from "next-intl/server";
import { PasswordManagerGuard } from "@/components/auth/PasswordManagerGuard";
import { Header } from "@/components/layout/Header";
import { LegalStrip } from "@/components/layout/LegalStrip";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { Providers } from "@/components/providers";
import { currentUserId } from "@/lib/auth/current-user";
import { supabaseEnabled } from "@/lib/env";
import type { Locale } from "@/i18n/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://painterapps.com"),
  title: {
    default: "PainterApps — Weather. Specs. Jobs.",
    template: "%s · PainterApps",
  },
  description:
    "Independent tools for professional painters and serious DIYers. Know when to paint, which system holds up, and what it will take.",
  applicationName: "PainterApps",
  openGraph: {
    type: "website",
    siteName: "PainterApps",
    title: "PainterApps — Weather. Specs. Jobs.",
    description:
      "Independent tools for professional painters. PaintDay weather scores, multi-brand System Match, and CoverCalc.",
    url: "https://painterapps.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "PainterApps — Weather. Specs. Jobs.",
    description:
      "Independent tools for professional painters and serious DIYers.",
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const [authEnabled, userId] = [supabaseEnabled(), await currentUserId()];

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-dvh max-w-full overflow-x-hidden bg-background font-sans text-foreground antialiased">
        <Providers locale={locale} messages={messages}>
          <PasswordManagerGuard enabled={Boolean(userId)} />
          <SiteChrome
            header={
              <Header
                locale={locale}
                authEnabled={authEnabled}
                signedIn={Boolean(userId)}
              />
            }
            footer={<LegalStrip />}
          >
            {children}
          </SiteChrome>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
