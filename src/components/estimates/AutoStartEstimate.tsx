"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { startEstimate } from "@/app/app/estimates/actions";

export function AutoStartEstimate({
  jobId,
  zip,
  customerId,
}: {
  jobId?: string;
  zip?: string;
  customerId?: string;
}) {
  const router = useRouter();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void startEstimate({ jobId, zip, customerId }).then((id) => {
      if (id) router.replace(`/app/estimates/${id}`);
    });
  }, [jobId, zip, customerId, router]);
  return (
    <p className="text-sm text-muted-foreground">Opening a blank letter…</p>
  );
}
