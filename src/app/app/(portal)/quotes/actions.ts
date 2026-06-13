"use server";

import { revalidatePath } from "next/cache";
import {
  quoteAcceptedEmail,
  quoteDeclinedEmail,
  quoteSentEmail,
  sendEmail,
} from "@/lib/email";
import { createNotification } from "@/lib/notifications/create";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOnboarded } from "@/lib/auth/session";
import { formatJobAddress } from "@/lib/address";
import { formatCurrency } from "@/lib/utils";
import type {
  LineItemType,
  QuoteLineItem,
  QuoteRoom,
  QuoteTier,
  QuoteTierName,
} from "@/types/database";

export type RoomInput = Omit<QuoteRoom, "id" | "quote_id"> & { id?: string };
export type LineItemInput = Omit<QuoteLineItem, "id" | "quote_id"> & {
  id?: string;
};
export type TierInput = Omit<QuoteTier, "id" | "quote_id"> & { id?: string };

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function getCompanyId() {
  const { company } = await requireOnboarded();
  if (!company) throw new Error("Company not found");
  return company.id;
}

type JobAddressInput = {
  job_address: string;
  job_address_line2?: string | null;
  job_city?: string | null;
  job_state?: string | null;
  job_zip?: string | null;
};

function normalizeJobAddressInput(
  input: Partial<JobAddressInput>,
): Partial<JobAddressInput> {
  const normalized: Partial<JobAddressInput> = { ...input };

  if (input.job_address !== undefined) {
    normalized.job_address = input.job_address.trim();
  }
  if (input.job_address_line2 !== undefined) {
    normalized.job_address_line2 = input.job_address_line2?.trim() || null;
  }
  if (input.job_city !== undefined) {
    normalized.job_city = input.job_city?.trim() || null;
  }
  if (input.job_state !== undefined) {
    normalized.job_state = input.job_state?.trim() || null;
  }
  if (input.job_zip !== undefined) {
    normalized.job_zip = input.job_zip?.trim() || null;
  }

  return normalized;
}

export async function createQuote(
  input: JobAddressInput & {
    customer_id: string;
    before_photos: string[];
  },
): Promise<ActionResult<{ id: string }>> {
  try {
    const companyId = await getCompanyId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("quotes")
      .insert({
        company_id: companyId,
        customer_id: input.customer_id,
        job_address: input.job_address.trim(),
        job_address_line2: input.job_address_line2?.trim() || null,
        job_city: input.job_city?.trim() || null,
        job_state: input.job_state?.trim() || null,
        job_zip: input.job_zip?.trim() || null,
        before_photos: input.before_photos,
        status: "draft",
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/app/quotes");
    return { success: true, data: { id: data.id } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create quote",
    };
  }
}

export async function updateQuote(
  quoteId: string,
  input: Partial<JobAddressInput> & {
    customer_id?: string;
    before_photos?: string[];
    status?: "draft" | "sent" | "accepted" | "declined";
  },
): Promise<ActionResult> {
  try {
    const companyId = await getCompanyId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("quotes")
      .update({
        ...normalizeJobAddressInput(input),
        updated_at: new Date().toISOString(),
      })
      .eq("id", quoteId)
      .eq("company_id", companyId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/app/quotes");
    revalidatePath(`/app/quotes/${quoteId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update quote",
    };
  }
}

export async function saveRooms(
  quoteId: string,
  rooms: RoomInput[],
): Promise<ActionResult> {
  try {
    const companyId = await getCompanyId();
    const supabase = await createClient();

    const { data: quote } = await supabase
      .from("quotes")
      .select("id")
      .eq("id", quoteId)
      .eq("company_id", companyId)
      .single();

    if (!quote) return { success: false, error: "Quote not found" };

    await supabase.from("quote_rooms").delete().eq("quote_id", quoteId);

    if (rooms.length > 0) {
      const { error } = await supabase.from("quote_rooms").insert(
        rooms.map((room) => ({
          quote_id: quoteId,
          name: room.name,
          surface_type: room.surface_type || "drywall",
          condition: room.condition || "good",
          sq_ft: room.sq_ft || 0,
          color_codes: room.color_codes || "",
          coats: room.coats || 2,
          prep_work: room.prep_work || "",
        })),
      );
      if (error) return { success: false, error: error.message };
    }

    revalidatePath(`/app/quotes/${quoteId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save rooms",
    };
  }
}

export async function saveLineItems(
  quoteId: string,
  items: LineItemInput[],
): Promise<ActionResult> {
  try {
    const companyId = await getCompanyId();
    const supabase = await createClient();

    const { data: quote } = await supabase
      .from("quotes")
      .select("id")
      .eq("id", quoteId)
      .eq("company_id", companyId)
      .single();

    if (!quote) return { success: false, error: "Quote not found" };

    await supabase.from("quote_line_items").delete().eq("quote_id", quoteId);

    if (items.length > 0) {
      const { error } = await supabase.from("quote_line_items").insert(
        items.map((item) => ({
          quote_id: quoteId,
          type: item.type as LineItemType,
          description: item.description,
          qty: item.qty || 1,
          unit_cost: item.unit_cost || 0,
          markup: item.markup || 0,
        })),
      );
      if (error) return { success: false, error: error.message };
    }

    revalidatePath(`/app/quotes/${quoteId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save line items",
    };
  }
}

export async function saveTiers(
  quoteId: string,
  tiers: TierInput[],
): Promise<ActionResult> {
  try {
    const companyId = await getCompanyId();
    const supabase = await createClient();

    const { data: quote } = await supabase
      .from("quotes")
      .select("id")
      .eq("id", quoteId)
      .eq("company_id", companyId)
      .single();

    if (!quote) return { success: false, error: "Quote not found" };

    await supabase.from("quote_tiers").delete().eq("quote_id", quoteId);

    if (tiers.length > 0) {
      const { error } = await supabase.from("quote_tiers").insert(
        tiers.map((tier) => ({
          quote_id: quoteId,
          tier: tier.tier,
          price: tier.price || 0,
          margin: tier.margin || 0,
          features: tier.features || [],
          benefits: tier.benefits || [],
        })),
      );
      if (error) return { success: false, error: error.message };
    }

    revalidatePath(`/app/quotes/${quoteId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save tiers",
    };
  }
}

export async function sendQuote(quoteId: string): Promise<ActionResult> {
  try {
    const companyId = await getCompanyId();
    const supabase = await createClient();

    const { data: quote, error } = await supabase
      .from("quotes")
      .select("*, customers(name, email, portal_token)")
      .eq("id", quoteId)
      .eq("company_id", companyId)
      .single();

    if (error || !quote) return { success: false, error: "Quote not found" };

    const { data: company } = await supabase
      .from("companies")
      .select("slug, name")
      .eq("id", companyId)
      .single();

    const customer = quote.customers as {
      name: string;
      email: string | null;
      portal_token: string;
    } | null;

    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${company?.slug}/quotes/${quoteId}?portal_token=${customer?.portal_token}`;

    if (customer?.email) {
      const template = quoteSentEmail({
        customerName: customer.name,
        companyName: company?.name ?? "Your painter",
        portalUrl,
      });
      const emailResult = await sendEmail({
        to: customer.email,
        toName: customer.name,
        ...template,
      });

      if (!emailResult.success) {
        return { success: false, error: emailResult.error };
      }
    }

    await createNotification({
      companyId,
      type: "quote_sent",
      title: `Quote sent to ${customer?.name ?? "customer"}`,
      body: formatJobAddress(quote),
      href: `/app/quotes/${quoteId}`,
    });

    await supabase
      .from("quotes")
      .update({ status: "sent", updated_at: new Date().toISOString() })
      .eq("id", quoteId);

    revalidatePath("/app/quotes");
    revalidatePath(`/app/quotes/${quoteId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send quote",
    };
  }
}

export async function acceptQuote(
  quoteId: string,
  tier: QuoteTierName,
  portalToken: string,
): Promise<ActionResult> {
  try {
    const supabase = createAdminClient();

    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("*, customers(portal_token, id, name)")
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      return { success: false, error: "Quote not found" };
    }

    const customer = quote.customers as {
      portal_token: string;
      id: string;
      name: string;
    } | null;

    if (!customer || customer.portal_token !== portalToken) {
      return { success: false, error: "Invalid portal access" };
    }

    const { data: tierData } = await supabase
      .from("quote_tiers")
      .select("price")
      .eq("quote_id", quoteId)
      .eq("tier", tier)
      .single();

    const { error: updateError } = await supabase
      .from("quotes")
      .update({
        status: "accepted",
        accepted_tier: tier,
        updated_at: new Date().toISOString(),
      })
      .eq("id", quoteId);

    if (updateError) return { success: false, error: updateError.message };

    const { data: existingJob } = await supabase
      .from("jobs")
      .select("id")
      .eq("quote_id", quoteId)
      .maybeSingle();

    if (!existingJob) {
      const defaultChecklist = [
        { id: "prep", label: "Site prep & protection", done: false },
        { id: "surfaces", label: "Surface prep complete", done: false },
        { id: "prime", label: "Primer applied (if needed)", done: false },
        { id: "coat1", label: "First coat complete", done: false },
        { id: "coat2", label: "Second coat complete", done: false },
        { id: "touchup", label: "Touch-ups & cleanup", done: false },
        {
          id: "walkthrough",
          label: "Final walkthrough with customer",
          done: false,
        },
      ];

      await supabase.from("jobs").insert({
        company_id: quote.company_id,
        quote_id: quoteId,
        customer_id: customer.id,
        tier,
        status: "active",
        selling_price: tierData?.price ?? 0,
        checklist: defaultChecklist,
      });
    }

    const tierLabels: Record<QuoteTierName, string> = {
      good: "Good",
      better: "Better",
      best: "Best",
      beautiful: "Beautiful",
    };

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const quoteUrl = `${appUrl}/app/quotes/${quoteId}`;

    await createNotification({
      companyId: quote.company_id,
      type: "quote_accepted",
      title: `${customer.name} accepted a quote`,
      body: `${tierLabels[tier]} · ${formatJobAddress(quote)}`,
      href: `/app/quotes/${quoteId}`,
    });

    const { data: company } = await supabase
      .from("companies")
      .select("name, email")
      .eq("id", quote.company_id)
      .single();

    if (company?.email) {
      const template = quoteAcceptedEmail({
        customerName: customer.name,
        companyName: company.name,
        jobAddress: formatJobAddress(quote),
        tierLabel: tierLabels[tier],
        price: formatCurrency(tierData?.price ?? 0),
        quoteUrl,
      });
      await sendEmail({
        to: company.email,
        toName: company.name,
        ...template,
      });
    }

    revalidatePath("/app/quotes");
    revalidatePath("/app/jobs");
    revalidatePath("/app/dashboard");

    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to accept quote",
    };
  }
}

export async function declineQuote(
  quoteId: string,
  portalToken: string,
): Promise<ActionResult> {
  try {
    const supabase = createAdminClient();

    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("*, customers(portal_token, name)")
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      return { success: false, error: "Quote not found" };
    }

    const customer = quote.customers as {
      portal_token: string;
      name: string;
    } | null;

    if (!customer || customer.portal_token !== portalToken) {
      return { success: false, error: "Invalid portal access" };
    }

    if (quote.status === "accepted") {
      return { success: false, error: "This quote has already been accepted." };
    }

    const { error: updateError } = await supabase
      .from("quotes")
      .update({
        status: "declined",
        updated_at: new Date().toISOString(),
      })
      .eq("id", quoteId);

    if (updateError) return { success: false, error: updateError.message };

    const { data: company } = await supabase
      .from("companies")
      .select("name, email")
      .eq("id", quote.company_id)
      .single();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const quoteUrl = `${appUrl}/app/quotes/${quoteId}`;

    await createNotification({
      companyId: quote.company_id,
      type: "quote_declined",
      title: `${customer.name} declined a quote`,
      body: formatJobAddress(quote),
      href: `/app/quotes/${quoteId}`,
    });

    if (company?.email) {
      const template = quoteDeclinedEmail({
        customerName: customer.name,
        jobAddress: formatJobAddress(quote),
        quoteUrl,
      });
      await sendEmail({
        to: company.email,
        toName: company.name,
        ...template,
      });
    }

    revalidatePath("/app/quotes");
    revalidatePath(`/app/quotes/${quoteId}`);
    revalidatePath("/app/dashboard");

    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to decline quote",
    };
  }
}

export async function duplicateQuote(
  quoteId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const companyId = await getCompanyId();
    const supabase = await createClient();

    const { data: source, error: sourceError } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .eq("company_id", companyId)
      .single();

    if (sourceError || !source) {
      return { success: false, error: "Quote not found" };
    }

    const [{ data: rooms }, { data: lineItems }, { data: tiers }] =
      await Promise.all([
        supabase.from("quote_rooms").select("*").eq("quote_id", quoteId),
        supabase.from("quote_line_items").select("*").eq("quote_id", quoteId),
        supabase.from("quote_tiers").select("*").eq("quote_id", quoteId),
      ]);

    const { data: newQuote, error: insertError } = await supabase
      .from("quotes")
      .insert({
        company_id: companyId,
        customer_id: source.customer_id,
        job_address: source.job_address,
        job_address_line2: source.job_address_line2,
        job_city: source.job_city,
        job_state: source.job_state,
        job_zip: source.job_zip,
        before_photos: source.before_photos ?? [],
        status: "draft",
      })
      .select("id")
      .single();

    if (insertError || !newQuote) {
      return { success: false, error: insertError?.message ?? "Duplicate failed" };
    }

    const newQuoteId = newQuote.id;

    if (rooms?.length) {
      await supabase.from("quote_rooms").insert(
        rooms.map(({ name, surface_type, condition, sq_ft, color_codes, coats, prep_work }) => ({
          quote_id: newQuoteId,
          name,
          surface_type,
          condition,
          sq_ft,
          color_codes,
          coats,
          prep_work,
        })),
      );
    }

    if (lineItems?.length) {
      await supabase.from("quote_line_items").insert(
        lineItems.map(({ type, description, qty, unit_cost, markup }) => ({
          quote_id: newQuoteId,
          type,
          description,
          qty,
          unit_cost,
          markup,
        })),
      );
    }

    if (tiers?.length) {
      await supabase.from("quote_tiers").insert(
        tiers.map(({ tier, price, margin, features, benefits }) => ({
          quote_id: newQuoteId,
          tier,
          price,
          margin,
          features,
          benefits,
        })),
      );
    }

    revalidatePath("/app/quotes");
    return { success: true, data: { id: newQuoteId } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to duplicate quote",
    };
  }
}