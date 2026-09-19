"use client";

import { useState } from "react";
import { Check, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

const MESSAGE_MAX = 5000;

export function ContactForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status.kind === "sending") return;

    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus({ kind: "sending" });

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          subject: data.get("subject"),
          message: data.get("message"),
          website: data.get("website"),
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setStatus({
          kind: "error",
          message:
            res.status === 429
              ? "Trop de messages envoyés coup sur coup. Réessaie dans quelques minutes."
              : body?.error ?? "L'envoi a échoué. Réessaie dans un instant.",
        });
        return;
      }

      form.reset();
      setMessage("");
      setStatus({ kind: "sent" });
    } catch {
      setStatus({
        kind: "error",
        message: "L'envoi a échoué. Vérifie ta connexion, ou écris-nous par email.",
      });
    }
  }

  if (status.kind === "sent") {
    return (
      <div
        role="status"
        className="flex items-start gap-3 border border-[#F0FF00]/30 bg-[#F0FF00]/[0.06] p-5"
      >
        <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#F0FF00]" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-[#f5f5f5]">Message envoyé.</p>
          <p className="text-sm text-[#f5f5f5]/60">
            On répond sous deux jours ouvrés, à l&apos;adresse que tu as indiquée.
          </p>
          <button
            type="button"
            onClick={() => setStatus({ kind: "idle" })}
            className="pt-1 text-sm text-[#F0FF00] underline underline-offset-4"
          >
            Écrire un autre message
          </button>
        </div>
      </div>
    );
  }

  const sending = status.kind === "sending";

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact-name">Nom</Label>
          <Input id="contact-name" name="name" required maxLength={120} autoComplete="name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-email">Adresse email</Label>
          <Input
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-subject">Objet</Label>
        <Input
          id="contact-subject"
          name="subject"
          maxLength={160}
          placeholder="Une question, un bug, une idée…"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <Label htmlFor="contact-message">Message</Label>
          <span className="text-xs text-[#f5f5f5]/40">
            {message.length} / {MESSAGE_MAX}
          </span>
        </div>
        <Textarea
          id="contact-message"
          name="message"
          required
          rows={7}
          maxLength={MESSAGE_MAX}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {/* Champ piège : caché à l'écran et aux lecteurs d'écran, laissé hors du
          parcours au clavier. Un robot qui remplit tout se signale tout seul. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="contact-website">Site web</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {status.kind === "error" && (
        <p role="alert" className="text-sm text-red-400">
          {status.message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        {/* `Button` ne pose pas de `gap` : les boutons à icône l'ajoutent. */}
        <Button type="submit" disabled={sending} className="gap-2">
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Envoi…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Envoyer
            </>
          )}
        </Button>
        <p className="text-xs text-[#f5f5f5]/50">
          Ou directement à{" "}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="text-[#F0FF00] underline underline-offset-4"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
        </p>
      </div>
    </form>
  );
}
