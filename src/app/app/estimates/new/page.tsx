import { AutoStartEstimate } from "@/components/estimates/AutoStartEstimate";

export const metadata = { title: "New estimate" };

export default async function NewEstimatePage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; zip?: string; customer?: string }>;
}) {
  const { job, zip, customer } = await searchParams;
  return (
    <AutoStartEstimate jobId={job} zip={zip} customerId={customer} />
  );
}
