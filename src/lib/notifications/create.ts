import { createAdminClient } from "@/lib/supabase/admin";

export type CreateNotificationInput = {
  companyId: string;
  type: string;
  title: string;
  body?: string;
  href?: string;
};

export async function createNotification(
  input: CreateNotificationInput,
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("notifications").insert({
      company_id: input.companyId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
    });
  } catch (error) {
    console.error("[notifications] Failed to create:", error);
  }
}