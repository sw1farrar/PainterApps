import Link from "next/link";
import { FileStack, Plus } from "lucide-react";
import { listSellSheets } from "@/app/app/(portal)/sell-sheets/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function SellSheetsPage() {
  const sheets = await listSellSheets();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-white">Sell sheets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your saved good-better-best marketing comparisons.
          </p>
        </div>
        <Button asChild>
          <Link href={`/free-tools/build-sell-sheet?new=${Date.now()}`}>
            <Plus className="mr-2 h-4 w-4" />
            New sell sheet
          </Link>
        </Button>
      </div>

      {sheets.length === 0 ? (
        <Card className="border-border bg-card/60">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <FileStack className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium text-white">No sell sheets yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Build a comparison in Free Tools and save it to your account.
              </p>
            </div>
            <Button asChild variant="secondary">
              <Link href={`/free-tools/build-sell-sheet?new=${Date.now()}`}>Build sell sheet</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sheets.map((sheet) => (
            <Card
              key={sheet.id}
              className="border-border bg-card/60 transition hover:border-primary/30"
            >
              <CardHeader>
                <CardTitle className="text-lg text-white">
                  {sheet.project_name?.trim() || "Untitled sell sheet"}
                </CardTitle>
                <CardDescription>
                  Updated {formatDate(sheet.updated_at)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="secondary" className="w-full">
                  <Link href={`/free-tools/build-sell-sheet?edit=${sheet.id}`}>
                    Edit
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}