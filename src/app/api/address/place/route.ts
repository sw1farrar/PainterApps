import { NextResponse } from "next/server";

import { isAddressAutocompleteEnabled } from "@/lib/address/env";
import { fetchVerifiedAddress } from "@/lib/address/google-places";
import { requireApiUser } from "@/lib/address/require-auth";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  if (!isAddressAutocompleteEnabled()) {
    return NextResponse.json(
      { error: "Address autocomplete is not configured.", enabled: false },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId")?.trim();
  const sessionToken = searchParams.get("session")?.trim() || undefined;

  if (!placeId) {
    return NextResponse.json({ error: "placeId is required." }, { status: 400 });
  }

  try {
    const address = await fetchVerifiedAddress(placeId, sessionToken);
    return NextResponse.json({ address });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not verify address.",
      },
      { status: 502 },
    );
  }
}