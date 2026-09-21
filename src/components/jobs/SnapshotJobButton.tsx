import Link from "next/link";
import { snapshotJob } from "@/app/app/jobs/actions";
import { Button } from "@/components/ui/button";
import type { JobOption } from "@/lib/jobs/list";

const PM_OFF = {
  autoComplete: "off" as const,
  "data-1p-ignore": true,
  "data-lpignore": "true",
  "data-bwignore": "true",
  "data-form-type": "other",
};

export function SnapshotJobButton({
  signedIn,
  canSnapshot = false,
  loginNext,
  kind,
  title,
  zip,
  payload,
  label,
  jobs = [],
  newJobLabel = "New job",
}: {
  signedIn: boolean;
  canSnapshot?: boolean;
  loginNext: string;
  kind: "weather" | "system" | "coverage";
  title: string;
  zip?: string;
  payload: Record<string, unknown>;
  label: string;
  jobs?: JobOption[];
  newJobLabel?: string;
}) {
  if (!signedIn) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href={`/sign-up?next=${encodeURIComponent(loginNext)}`}>
          {label}
        </Link>
      </Button>
    );
  }
  if (!canSnapshot) return null;

  return (
    <form
      action={snapshotJob}
      className="flex flex-wrap items-center gap-2"
      autoComplete="off"
      data-block-password-manager
      data-1p-ignore
      data-lpignore="true"
      data-bwignore="true"
      data-form-type="other"
    >
      <input type="hidden" name="kind" value={kind} {...PM_OFF} />
      <input type="hidden" name="title" value={title} {...PM_OFF} />
      <input type="hidden" name="zip" value={zip ?? ""} {...PM_OFF} />
      <input
        type="hidden"
        name="payload"
        value={JSON.stringify(payload)}
        {...PM_OFF}
      />
      {jobs.length > 0 ? (
        <select
          name="job_id"
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          defaultValue=""
          aria-label={label}
          {...PM_OFF}
        >
          <option value="">{newJobLabel}</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title}
            </option>
          ))}
        </select>
      ) : null}
      <Button type="submit" variant="outline" size="sm">
        {label}
      </Button>
    </form>
  );
}
