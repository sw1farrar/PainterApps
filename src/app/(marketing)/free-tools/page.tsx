import FreeToolsContent from "@/components/FreeToolsContent";
import { getSession } from "@/lib/auth/session";

export default async function FreeToolsPage() {
  const session = await getSession();

  return <FreeToolsContent isLoggedIn={Boolean(session)} />;
}