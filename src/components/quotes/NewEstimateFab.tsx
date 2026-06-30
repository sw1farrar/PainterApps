"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type NewEstimateFabProps = {
  className?: string;
  onClick?: () => void;
  href?: string;
};

const fabClassName =
  "fixed bottom-6 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] sm:right-6";

export function NewEstimateFab({ className, onClick, href }: NewEstimateFabProps) {
  const classes = cn(fabClassName, className);

  if (href) {
    return (
      <Link href={href} className={classes}>
        <Plus className="h-5 w-5" />
        <span>New estimate</span>
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      <Plus className="h-5 w-5" />
      <span>New estimate</span>
    </button>
  );
}