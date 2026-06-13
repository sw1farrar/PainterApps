import { NextResponse } from "next/server";

import { isAddressAutocompleteEnabled } from "@/lib/address/env";
import { requireApiUser } from "@/lib/address/require-auth";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  return NextResponse.json({
    enabled: isAddressAutocompleteEnabled(),
    provider: "google",
  });
}