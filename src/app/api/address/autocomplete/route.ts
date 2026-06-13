import { NextResponse } from "next/server";

import { isAddressAutocompleteEnabled } from "@/lib/address/env";
import { fetchAddressSuggestions } from "@/lib/address/google-places";
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
  const query = searchParams.get("q")?.trim() ?? "";
  const sessionToken = searchParams.get("session")?.trim() || undefined;

  if (query.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const suggestions = await fetchAddressSuggestions(query, sessionToken);
    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Address search failed.",
      },
      { status: 502 },
    );
  }
}