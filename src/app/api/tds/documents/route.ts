import { listDocuments } from "@/lib/systems/documents";

export async function GET(request: Request) {
  const productId =
    new URL(request.url).searchParams.get("product_id") ?? undefined;
  try {
    const documents = await listDocuments(productId);
    return Response.json({ documents });
  } catch (error) {
    return Response.json(
      {
        documents: [],
        error: error instanceof Error ? error.message : "Could not list data sheets.",
      },
      { status: 503 },
    );
  }
}
