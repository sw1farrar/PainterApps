import { createEstimate } from "../actions";

export const metadata = { title: "New estimate" };

export default async function NewEstimatePage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; zip?: string; customer?: string }>;
}) {
  const { job, zip, customer } = await searchParams;
  const form = new FormData();
  if (job) form.set("job_id", job);
  if (zip) form.set("zip", zip);
  if (customer) form.set("customer_id", customer);
  await createEstimate(form);
}
