import Logo from "@/components/Logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="portal-shell flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10">
      <div className="mb-8">
        <Logo size="md" />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}