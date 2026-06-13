import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import { Toaster } from "sonner";
import AppProviders from "@/providers/AppProviders";
import "./globals.css";

const sourceSans = Source_Sans_3({
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal"],
  subsets: ["latin"],
  variable: "--font-source",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PainterApps — Tools Built for Professional Painters",
  description:
    "Create polished quotes, good-better-best comparison proposals, and win more jobs. Software designed for house and commercial painting contractors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body
        className={`${sourceSans.variable} bg-background font-sans text-foreground antialiased`}
      >
        <AppProviders>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              classNames: {
                toast: "bg-card border-border text-foreground",
                description: "text-muted-foreground",
              },
            }}
          />
        </AppProviders>
      </body>
    </html>
  );
}