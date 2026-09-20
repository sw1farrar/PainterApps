import { currentAccess, type Access } from "@/lib/auth/access";
import { isNewsEditor } from "@/lib/news/editors";

export async function requireCatalogEditor(): Promise<Access | null> {
  const access = await currentAccess();
  if (!access) return null;
  if (access.isPlatformAdmin) return access;
  if (await isNewsEditor(access.userId)) return access;
  return null;
}
