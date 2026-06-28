import Link from "next/link";

import Logo from "@/components/Logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="portal-shell site-viewport-shell min-h-0">
      <div className="flex shrink-0 justify-center px-4 pt-10">
        <Link
          href="/"
          aria-label="PainterApps home"
          className="inline-flex transition-opacity hover:opacity-90"
        >
          <Logo size="md" />
        </Link>
      </div>
      <div data-site-scroll-main className="site-scroll-main scroll-smooth px-4 pb-10">
        <div className="flex min-h-full items-center justify-center py-6">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}