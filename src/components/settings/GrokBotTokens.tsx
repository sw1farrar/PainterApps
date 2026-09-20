"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type Summary = {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: string;
};

export function GrokBotTokens() {
  const t = useTranslations("app");
  const [tokens, setTokens] = useState<Summary[]>([]);
  const [fresh, setFresh] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function load() {
    const res = await fetch("/api/mcp/tokens");
    const json = (await res.json()) as { tokens?: Summary[]; error?: string };
    if (!res.ok) {
      setError(json.error ?? "Could not load tokens.");
      return;
    }
    setTokens(json.tokens ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setPending(true);
    setError(null);
    setFresh(null);
    const res = await fetch("/api/mcp/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Grok bot" }),
    });
    const json = (await res.json()) as { token?: string; error?: string };
    setPending(false);
    if (!res.ok || !json.token) {
      setError(json.error ?? "Could not create token.");
      return;
    }
    setFresh(json.token);
    await load();
  }

  async function revoke(id: string) {
    setPending(true);
    await fetch(`/api/mcp/tokens/${id}`, { method: "DELETE" });
    setPending(false);
    await load();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("grokBotHelp")}</p>
      {fresh ? (
        <p className="break-all rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs">
          {t("grokBotCreated")}
          <br />
          {fresh}
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" variant="outline" disabled={pending} onClick={create}>
        {t("grokBotCreate")}
      </Button>
      {tokens.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("grokBotEmpty")}</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {tokens.map((tok) => (
            <li
              key={tok.id}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <span className="font-mono text-xs">{tok.tokenPrefix}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => revoke(tok.id)}
              >
                {t("grokBotRevoke")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
