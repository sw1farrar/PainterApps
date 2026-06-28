import { FreeToolsShell } from "@/components/FreeToolsShell";
import { getSession } from "@/lib/auth/session";

export default async function FreeToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return <FreeToolsShell session={session}>{children}</FreeToolsShell>;
}