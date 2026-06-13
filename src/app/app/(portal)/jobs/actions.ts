"use server";

import { revalidatePath } from "next/cache";

import { formatJobAddress, type JobAddressFields } from "@/lib/address";
import { requireOnboarded } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnvError } from "@/lib/supabase/env";
import { createNotification } from "@/lib/notifications/create";
import type { JobChecklistItem } from "@/types/database";

export type ActionResult = {
  success: boolean;
  error?: string;
};

const JOB_STATUSES = ["active", "completed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
): Promise<ActionResult> {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  if (!JOB_STATUSES.includes(status)) {
    return { success: false, error: "Invalid job status." };
  }

  const session = await requireOnboarded();
  const companyId = session.company?.id;

  if (!companyId) {
    return { success: false, error: "Company not found." };
  }

  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id, customers(name), quotes(job_address, job_address_line2, job_city, job_state, job_zip)",
    )
    .eq("id", jobId)
    .eq("company_id", companyId)
    .single();

  const { error } = await supabase
    .from("jobs")
    .update({ status })
    .eq("id", jobId)
    .eq("company_id", companyId);

  if (error) return { success: false, error: error.message };

  if (status === "completed" && job) {
    type JobNotifyRow = {
      customers: { name: string } | null;
      quotes: JobAddressFields | null;
    };
    const row = job as unknown as JobNotifyRow;
    await createNotification({
      companyId,
      type: "job_completed",
      title: `Job completed — ${row.customers?.name ?? "Customer"}`,
      body: row.quotes ? formatJobAddress(row.quotes) : undefined,
      href: `/app/jobs/${jobId}`,
    });
  }

  revalidatePath("/app/jobs");
  revalidatePath(`/app/jobs/${jobId}`);
  revalidatePath("/app/dashboard");
  return { success: true };
}

export async function updateJobPhotos(
  jobId: string,
  photos: string[],
): Promise<ActionResult> {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  const session = await requireOnboarded();
  const companyId = session.company?.id;

  if (!companyId) {
    return { success: false, error: "Company not found." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("jobs")
    .update({ job_photos: photos })
    .eq("id", jobId)
    .eq("company_id", companyId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/app/jobs/${jobId}`);
  return { success: true };
}

export async function updateJobNotes(
  jobId: string,
  notes: string,
): Promise<ActionResult> {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  const session = await requireOnboarded();
  const companyId = session.company?.id;
  if (!companyId) return { success: false, error: "Company not found." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("jobs")
    .update({ notes: notes.trim() || null })
    .eq("id", jobId)
    .eq("company_id", companyId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/app/jobs/${jobId}`);
  return { success: true };
}

export async function updateJobChecklist(
  jobId: string,
  checklist: JobChecklistItem[],
): Promise<ActionResult> {
  const envError = getSupabaseEnvError();
  if (envError) return { success: false, error: envError };

  const session = await requireOnboarded();
  const companyId = session.company?.id;
  if (!companyId) return { success: false, error: "Company not found." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("jobs")
    .update({ checklist })
    .eq("id", jobId)
    .eq("company_id", companyId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/app/jobs/${jobId}`);
  return { success: true };
}