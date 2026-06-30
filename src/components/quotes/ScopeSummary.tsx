"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatJobAddress } from "@/lib/address";
import { lineItemTotal } from "@/lib/quotes/area-helpers";
import { formatCurrency } from "@/lib/utils";
import type { LineItemInput, RoomInput } from "@/app/app/(portal)/quotes/actions";
import type { JobAddressFields } from "@/lib/address";

type ScopeSummaryProps = {
  quoteName: string;
  customerName?: string;
  jobAddress: JobAddressFields;
  rooms: RoomInput[];
  lineItems: LineItemInput[];
  subtotal: number;
};

export function ScopeSummary({
  quoteName,
  customerName,
  jobAddress,
  rooms,
  lineItems,
  subtotal,
}: ScopeSummaryProps) {
  const [areasOpen, setAreasOpen] = useState(true);
  const [itemsOpen, setItemsOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Scope summary</CardTitle>
        <CardDescription>
          {quoteName || "Untitled quote"}
          {customerName ? ` · ${customerName}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">{formatJobAddress(jobAddress)}</p>

        <button
          type="button"
          className="flex w-full items-center gap-2 font-semibold text-foreground"
          onClick={() => setAreasOpen((v) => !v)}
        >
          {areasOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Areas ({rooms.length})
        </button>
        {areasOpen ? (
          <ul className="space-y-2 pl-6">
            {rooms.map((room, index) => (
              <li key={`${room.name}-${index}`} className="text-muted-foreground">
                <span className="text-foreground">{room.name}</span>
                {room.sq_ft > 0 ? ` — ${room.sq_ft} sq ft` : ""}
                {room.is_optional ? (
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    Optional
                  </Badge>
                ) : null}
              </li>
            ))}
            {!rooms.length ? (
              <li className="text-muted-foreground">No areas added</li>
            ) : null}
          </ul>
        ) : null}

        <button
          type="button"
          className="flex w-full items-center gap-2 font-semibold text-foreground"
          onClick={() => setItemsOpen((v) => !v)}
        >
          {itemsOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Line items ({lineItems.length})
        </button>
        {itemsOpen ? (
          <ul className="max-h-48 space-y-1 overflow-y-auto pl-6 text-muted-foreground">
            {lineItems.map((item, index) => (
              <li
                key={`${item.description}-${index}`}
                className="flex justify-between gap-2"
              >
                <span className="truncate">{item.description}</span>
                <span className="shrink-0">
                  {formatCurrency(lineItemTotal(item))}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex justify-between border-t border-border pt-3 font-semibold text-foreground">
          <span>Direct costs</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
      </CardContent>
    </Card>
  );
}