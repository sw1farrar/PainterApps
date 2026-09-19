"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/auth/current-user";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { createClient } from "@/lib/supabase/server";

export async function saveJob(formData: FormData) {
  const userId = await currentUserId();
  const supabase = await createClient();
  if (!userId || !supabase) return;
  await ensureProfile(userId);
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      user_id: userId,
      title: String(formData.get("title") ?? "Untitled job"),
      zip: String(formData.get("zip") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
    })
    .select("id")
    .single();
  if (error || !data) return;
  revalidatePath("/app/jobs");
  revalidatePath("/app");
  redirect(`/app/jobs/${data.id}`);
}

type SnapshotKind = "weather" | "system" | "coverage";

function parsePayload(raw: string) {
  if (raw.length > 8000) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function snapshotJob(formData: FormData) {
  const userId = await currentUserId();
  const supabase = await createClient();
  if (!userId || !supabase) redirect("/login?next=/app/jobs");
  await ensureProfile(userId);

  const kind = String(formData.get("kind") ?? "") as SnapshotKind;
  const payload = parsePayload(String(formData.get("payload") ?? ""));
  if (!payload || !["weather", "system", "coverage"].includes(kind)) {
    redirect("/app/jobs");
  }

  const title =
    String(formData.get("title") ?? "").trim() ||
    (kind === "weather"
      ? "PaintDay snapshot"
      : kind === "system"
        ? "System snapshot"
        : "CoverCalc snapshot");
  const zip = String(formData.get("zip") ?? "").trim() || null;
  const existingId = String(formData.get("job_id") ?? "").trim();
  const patch = {
    weather_snapshot: kind === "weather" ? payload : undefined,
    system_snapshot: kind === "system" ? payload : undefined,
    coverage_snapshot: kind === "coverage" ? payload : undefined,
    zip: zip || undefined,
  };

  let jobId = existingId;
  if (existingId) {
    const { error } = await supabase
      .from("jobs")
      .update(patch)
      .eq("id", existingId)
      .eq("user_id", userId);
    if (error) redirect("/app/jobs");
  } else {
    const { data, error } = await supabase
      .from("jobs")
      .insert({
        user_id: userId,
        title,
        zip,
        weather_snapshot: kind === "weather" ? payload : null,
        system_snapshot: kind === "system" ? payload : null,
        coverage_snapshot: kind === "coverage" ? payload : null,
      })
      .select("id")
      .single();
    if (error || !data) redirect("/app/jobs");
    jobId = data.id;
  }

  revalidatePath("/app/jobs");
  revalidatePath(`/app/jobs/${jobId}`);
  revalidatePath("/app");
  redirect(`/app/jobs/${jobId}`);
}

export async function deleteJob(id: string) {
  const userId = await currentUserId();
  const supabase = await createClient();
  if (!userId || !supabase) return;
  await supabase.from("jobs").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/app/jobs");
  revalidatePath("/app");
}
