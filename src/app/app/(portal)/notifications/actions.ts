"use server";

import { revalidatePath } from "next/cache";

import { requireOnboarded } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export async function getNotifications(): Promise<NotificationRow[]> {
  const session = await requireOnboarded();
  const supabase = await createClient();

  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, href, read_at, created_at")
    .eq("company_id", session.company!.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return data ?? [];
}

export async function markNotificationRead(
  notificationId: string,
): Promise<void> {
  const session = await requireOnboarded();
  const supabase = await createClient();

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("company_id", session.company!.id);

  revalidatePath("/app/dashboard");
}

export async function markAllNotificationsRead(): Promise<void> {
  const session = await requireOnboarded();
  const supabase = await createClient();

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("company_id", session.company!.id)
    .is("read_at", null);

  revalidatePath("/app/dashboard");
}