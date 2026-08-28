"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import type { ManualEntry } from "../parsers/royalties-types";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface RoyaltiesManualModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (entry: ManualEntry) => void;
  entry: ManualEntry | null;
}

const MONTHS = [
  { value: "01", label: "Janvier" }, { value: "02", label: "Février" },
  { value: "03", label: "Mars" }, { value: "04", label: "Avril" },
  { value: "05", label: "Mai" }, { value: "06", label: "Juin" },
  { value: "07", label: "Juillet" }, { value: "08", label: "Août" },
  { value: "09", label: "Septembre" }, { value: "10", label: "Octobre" },
  { value: "11", label: "Novembre" }, { value: "12", label: "Décembre" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => String(currentYear - i));

type FormState = {
  month: string;
  year: string;
  trackTitle: string;
  streams: string;
  revenue: string;
  currency: string;
  album: string;
  isrc: string;
  store: string;
  country: string;
};

const EMPTY_FORM: FormState = {
  month: String(new Date().getMonth() + 1).padStart(2, "0"),
  year: String(currentYear),
  trackTitle: "",
  streams: "",
  revenue: "",
  currency: "USD",
  album: "",
  isrc: "",
  store: "",
  country: "",
};

export function RoyaltiesManualModal({ open, onClose, onSave, entry }: RoyaltiesManualModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;
    if (entry) {
      const [year, month] = entry.period.split("-");
      setForm({
        month: month ?? "01",
        year: year ?? String(currentYear),
        trackTitle: entry.trackTitle,
        streams: String(entry.streams),
        revenue: String(entry.revenue),
        currency: entry.currency,
        album: entry.album ?? "",
        isrc: entry.isrc ?? "",
        store: entry.store,
        country: entry.country,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, entry]);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const isValid = form.trackTitle.trim() && form.streams && form.revenue && form.month && form.year;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    const saved: ManualEntry = {
      id: entry?.id ?? generateId(),
      distributor: "manual",
      period: `${form.year}-${form.month}`,
      trackTitle: form.trackTitle.trim(),
      streams: parseInt(form.streams, 10) || 0,
      revenue: parseFloat(form.revenue.replace(",", ".")) || 0,
      currency: form.currency,
      store: form.store.trim(),
      country: form.country.trim(),
      album: form.album.trim() || undefined,
      isrc: form.isrc.trim() || undefined,
    };
    if (entry) {
      posthog.capture("royalty_entry_updated", { store: saved.store, currency: saved.currency });
    } else {
      posthog.capture("royalty_entry_added", { store: saved.store, currency: saved.currency });
    }
    onSave(saved);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg border border-[rgba(245,245,245,0.12)] bg-[#101010] text-[#F5F5F5]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {entry ? "Modifier l'entrée" : "Ajouter un titre"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Période */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-[#F5F5F5]/60">Mois *</Label>
              <Select value={form.month} onValueChange={(v) => setForm((p) => ({ ...p, month: v }))}>
                <SelectTrigger className="border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.9)] text-sm text-[#F5F5F5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[rgba(245,245,245,0.16)] bg-[#101010] text-[#F5F5F5]">
                  {MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-[#F5F5F5]/60">Année *</Label>
              <Select value={form.year} onValueChange={(v) => setForm((p) => ({ ...p, year: v }))}>
                <SelectTrigger className="border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.9)] text-sm text-[#F5F5F5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[rgba(245,245,245,0.16)] bg-[#101010] text-[#F5F5F5]">
                  {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Titre */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-[#F5F5F5]/60">Titre *</Label>
            <Input value={form.trackTitle} onChange={set("trackTitle")} placeholder="Nom du titre" required
              className="border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.9)] text-sm text-[#F5F5F5]" />
          </div>

          {/* Streams + Revenus + Devise */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-[#F5F5F5]/60">Streams *</Label>
              <Input type="number" min="0" value={form.streams} onChange={set("streams")} placeholder="0" required
                className="border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.9)] text-sm text-[#F5F5F5]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-[#F5F5F5]/60">Revenus *</Label>
              <Input value={form.revenue} onChange={set("revenue")} placeholder="0.00" required
                className="border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.9)] text-sm text-[#F5F5F5]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-[#F5F5F5]/60">Devise *</Label>
              <Select value={form.currency} onValueChange={(v) => setForm((p) => ({ ...p, currency: v }))}>
                <SelectTrigger className="border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.9)] text-sm text-[#F5F5F5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[rgba(245,245,245,0.16)] bg-[#101010] text-[#F5F5F5]">
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Champs optionnels */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-[#F5F5F5]/60">Album</Label>
              <Input value={form.album} onChange={set("album")} placeholder="Optionnel"
                className="border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.9)] text-sm text-[#F5F5F5]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-[#F5F5F5]/60">ISRC</Label>
              <Input value={form.isrc} onChange={set("isrc")} placeholder="Optionnel"
                className="border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.9)] text-sm text-[#F5F5F5]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-[#F5F5F5]/60">Plateforme</Label>
              <Input value={form.store} onChange={set("store")} placeholder="Ex : Spotify"
                className="border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.9)] text-sm text-[#F5F5F5]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-[#F5F5F5]/60">Pays</Label>
              <Input value={form.country} onChange={set("country")} placeholder="Ex : FR"
                className="border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.9)] text-sm text-[#F5F5F5]" />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}
              className="border-[rgba(245,245,245,0.3)] bg-transparent text-[#F5F5F5] hover:bg-[rgba(245,245,245,0.08)]">
              Annuler
            </Button>
            <Button type="submit" disabled={!isValid}
              className="bg-[#F0FF00] text-[#101010] hover:bg-[#F0FF00]/90">
              {entry ? "Mettre à jour" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
