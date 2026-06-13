import { requireSession } from "@/lib/auth/session";
import { PasswordManagerProvider } from "@/providers/PasswordManagerProvider";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  return (
    <PasswordManagerProvider suppress>{children}</PasswordManagerProvider>
  );
}