"use client";

import * as React from "react";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { JobChecklistItem } from "@/types/database";
import { updateJobChecklist, updateJobNotes } from "../actions";

const DEFAULT_CHECKLIST: JobChecklistItem[] = [
  { id: "prep", label: "Site prep & protection", done: false },
  { id: "surfaces", label: "Surface prep complete", done: false },
  { id: "prime", label: "Primer applied (if needed)", done: false },
  { id: "coat1", label: "First coat complete", done: false },
  { id: "coat2", label: "Second coat complete", done: false },
  { id: "touchup", label: "Touch-ups & cleanup", done: false },
  { id: "walkthrough", label: "Final walkthrough with customer", done: false },
];

type JobWorkPanelProps = {
  jobId: string;
  initialNotes: string;
  initialChecklist: JobChecklistItem[];
};

export function JobWorkPanel({
  jobId,
  initialNotes,
  initialChecklist,
}: JobWorkPanelProps) {
  const router = useRouter();
  const [notes, setNotes] = React.useState(initialNotes);
  const [checklist, setChecklist] = React.useState(initialChecklist);
  const [newItem, setNewItem] = React.useState("");
  const [savingNotes, setSavingNotes] = React.useState(false);
  const [savingChecklist, setSavingChecklist] = React.useState(false);

  React.useEffect(() => {
    setNotes(initialNotes);
    setChecklist(initialChecklist);
  }, [initialNotes, initialChecklist]);

  async function handleSaveNotes() {
    setSavingNotes(true);
    const result = await updateJobNotes(jobId, notes);
    setSavingNotes(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to save notes.");
      return;
    }

    toast.success("Notes saved.");
    router.refresh();
  }

  async function persistChecklist(next: JobChecklistItem[]) {
    setChecklist(next);
    setSavingChecklist(true);
    const result = await updateJobChecklist(jobId, next);
    setSavingChecklist(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to save checklist.");
      setChecklist(initialChecklist);
      return;
    }

    router.refresh();
  }

  function toggleItem(id: string) {
    persistChecklist(
      checklist.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    );
  }

  function addItem() {
    const label = newItem.trim();
    if (!label) return;

    persistChecklist([
      ...checklist,
      { id: crypto.randomUUID(), label, done: false },
    ]);
    setNewItem("");
  }

  function removeItem(id: string) {
    persistChecklist(checklist.filter((item) => item.id !== id));
  }

  function loadDefaultChecklist() {
    if (
      checklist.length > 0 &&
      !confirm("Replace the current checklist with the default template?")
    ) {
      return;
    }
    persistChecklist(DEFAULT_CHECKLIST);
  }

  const completedCount = checklist.filter((item) => item.done).length;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Job notes</CardTitle>
          <CardDescription>
            Crew notes, access instructions, or change orders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Gate code, paint colors confirmed, special requests…"
            rows={6}
          />
          <Button onClick={handleSaveNotes} disabled={savingNotes}>
            {savingNotes ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Save notes
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Job checklist</CardTitle>
              <CardDescription>
                {checklist.length
                  ? `${completedCount} of ${checklist.length} complete`
                  : "Track on-site progress step by step."}
              </CardDescription>
            </div>
            {savingChecklist ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {checklist.length === 0 ? (
            <Button variant="outline" size="sm" onClick={loadDefaultChecklist}>
              Load default checklist
            </Button>
          ) : null}

          <div className="space-y-2">
            {checklist.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/10 px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
                    item.done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background"
                  }`}
                  aria-label={item.done ? "Mark incomplete" : "Mark complete"}
                >
                  {item.done ? <Check className="h-3.5 w-3.5" /> : null}
                </button>
                <span
                  className={`min-w-0 flex-1 text-sm ${
                    item.done
                      ? "text-muted-foreground line-through"
                      : "text-foreground"
                  }`}
                >
                  {item.label}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => removeItem(item.id)}
                  aria-label="Remove item"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="new-checklist-item" className="sr-only">
                New checklist item
              </Label>
              <Input
                id="new-checklist-item"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Add a task…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={addItem}
              disabled={!newItem.trim()}
              aria-label="Add checklist item"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}