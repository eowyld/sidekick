"use client";

import { useEffect, useRef, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { FileUp, Users, UserPlus, ChevronDown, Pencil, Trash2, Plus, Loader2, AlertCircle, Bold, Underline, Link as LinkIcon, Image, Settings, FolderOpen } from "lucide-react";
import {
  MAILING_STORAGE_KEYS,
  type MailingCampaign,
  type MailingContact,
  type MailingSegment,
  DEFAULT_SEGMENT_NAME
} from "@/modules/marketing/data/mailing";
import { isoToFr } from "@/lib/date-format";

type TabId = "campaigns" | "newCampaign" | "contacts";
type LoadCampaignTab = "saved" | "sent";
const ALL_SEGMENTS_ID = "__all__";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function MailingPage() {
  const [activeTab, setActiveTab] = useState<TabId>("campaigns");

  const [campaigns, setCampaigns] = useLocalStorage<MailingCampaign[]>(
    MAILING_STORAGE_KEYS.campaigns,
    []
  );
  const [draftCampaigns, setDraftCampaigns] = useLocalStorage<MailingCampaign[]>(
    MAILING_STORAGE_KEYS.drafts,
    []
  );
  const [contacts, setContacts] = useLocalStorage<MailingContact[]>(
    MAILING_STORAGE_KEYS.contacts,
    []
  );
  const [segments, setSegments] = useLocalStorage<MailingSegment[]>(
    MAILING_STORAGE_KEYS.segments,
    [{ id: "general", name: DEFAULT_SEGMENT_NAME }]
  );

  // Formulaire campagne
  const [formCampaignName, setFormCampaignName] = useState("");
  const [formCampaignSubject, setFormCampaignSubject] = useState("");
  const [formCampaignAccroche, setFormCampaignAccroche] = useState("");
  const [formCampaignContentHtml, setFormCampaignContentHtml] = useState("");
  const [formCampaignSegmentIds, setFormCampaignSegmentIds] = useState<string[]>(
    []
  );

  // Formulaire contact
  const [formContactNom, setFormContactNom] = useState("");
  const [formContactPrenom, setFormContactPrenom] = useState("");
  const [formContactMail, setFormContactMail] = useState("");
  const [formContactDate, setFormContactDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [formContactSegmentIds, setFormContactSegmentIds] = useState<string[]>(
    []
  );

  // Dialogs et import
  const [manualContactOpen, setManualContactOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [importFromContactsOpen, setImportFromContactsOpen] = useState(false);
  const [sidekickContacts, setSidekickContacts] = useState<
    Array<{ id: number; firstName: string; lastName: string; email?: string }>
  >([]);
  const [selectedSidekickIds, setSelectedSidekickIds] = useState<Set<number>>(
    new Set()
  );
  const [importSegmentIds, setImportSegmentIds] = useState<string[]>([]);
  const [newSegmentName, setNewSegmentName] = useState("");
  const [newSegmentDialogOpen, setNewSegmentDialogOpen] = useState(false);
  const [loadCampaignOpen, setLoadCampaignOpen] = useState(false);
  const [loadCampaignTab, setLoadCampaignTab] = useState<LoadCampaignTab>("saved");
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  // Adresses connectées (Gmail/Outlook) pour l'envoi
  const [connectedAddresses, setConnectedAddresses] = useState<string[]>([]);
  const [selectedFromEmail, setSelectedFromEmail] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Éditeur de contenu email : ref textarea (vue HTML) et contentEditable (vue aperçu)
  const contentHtmlRef = useRef<HTMLTextAreaElement>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const wasHtmlViewRef = useRef(false);
  const pendingCursorRef = useRef<number | null>(null);
  const savedLinkRangeRef = useRef<Range | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [htmlView, setHtmlView] = useState(false);
  const [currentFontSize, setCurrentFontSize] = useState("16px");

  const EMAIL_COLORS = [
    { value: "#000000", label: "Noir" },
    { value: "#1a1a1a", label: "Gris foncé" },
    { value: "#666666", label: "Gris" },
    { value: "#e11d48", label: "Rouge" },
    { value: "#ea580c", label: "Orange" },
    { value: "#ca8a04", label: "Jaune" },
    { value: "#16a34a", label: "Vert" },
    { value: "#2563eb", label: "Bleu" },
    { value: "#7c3aed", label: "Violet" }
  ];

  // Stats Supabase (ouverts, clics) pour l'historique — mises à jour par les pixels
  const [campaignStats, setCampaignStats] = useState<
    Record<string, { ouverts: number; pctOuverture: number; clics: number; pctClics: number }>
  >({});

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (!user) {
          setConnectedAddresses([]);
          setSelectedFromEmail("");
          return;
        }
        const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
        const mailFrom = meta.mail_from as string | null | undefined;
        const gmailEmail = (meta.gmail_email as string | null) ?? (mailFrom && String(mailFrom).includes("gmail") ? mailFrom : null);
        const outlookEmail = (meta.outlook_email as string | null) ?? (mailFrom && (String(mailFrom).includes("outlook") || String(mailFrom).includes("hotmail")) ? mailFrom : null);
        const hasGmail = !!(meta.gmail_refresh_token as string | undefined);
        const hasOutlook = !!(meta.outlook_refresh_token as string | undefined);
        const addresses: string[] = [];
        if (hasGmail && gmailEmail) addresses.push(gmailEmail);
        if (hasOutlook && outlookEmail) addresses.push(outlookEmail);
        setConnectedAddresses(addresses);
        setSelectedFromEmail((prev) => (addresses.includes(prev) ? prev : addresses[0] ?? ""));
      })
      .catch(() => {
        setConnectedAddresses([]);
        setSelectedFromEmail("");
      });
  }, []);

  // En mode aperçu : synchroniser le contenu du contentEditable au passage depuis la vue HTML ou si vide au montage
  useEffect(() => {
    if (htmlView) {
      wasHtmlViewRef.current = true;
    } else {
      const el = contentEditableRef.current;
      if (el && (wasHtmlViewRef.current || !el.innerHTML.trim())) {
        el.innerHTML = formCampaignContentHtml || "";
      }
      wasHtmlViewRef.current = false;
    }
  }, [htmlView]);

  // En vue HTML : replacer le curseur après une insertion (React met à jour le textarea de façon asynchrone)
  useEffect(() => {
    const pos = pendingCursorRef.current;
    if (pos === null || !htmlView) return;
    const ta = contentHtmlRef.current;
    if (!ta) return;
    pendingCursorRef.current = null;
    ta.focus();
    const len = ta.value.length;
    ta.setSelectionRange(Math.min(pos, len), Math.min(pos, len));
  }, [htmlView, formCampaignContentHtml]);

  // Charger les stats (ouverts, clics) depuis Supabase pour l'historique
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("mailing_campaigns")
      .select("id, ouverts, pct_ouverture, clics, pct_clics")
      .then(({ data, error }) => {
        if (error) return;
        const map: Record<string, { ouverts: number; pctOuverture: number; clics: number; pctClics: number }> = {};
        (data ?? []).forEach((row: { id: string; ouverts?: number; pct_ouverture?: number; clics?: number; pct_clics?: number }) => {
          map[row.id] = {
            ouverts: row.ouverts ?? 0,
            pctOuverture: Number(row.pct_ouverture) ?? 0,
            clics: row.clics ?? 0,
            pctClics: Number(row.pct_clics) ?? 0
          };
        });
        setCampaignStats(map);
      })
      .catch(() => {});
  }, [activeTab, campaigns.length]);

  const clearCampaignForm = () => {
    setFormCampaignName("");
    setFormCampaignSubject("");
    setFormCampaignAccroche("");
    setFormCampaignContentHtml("");
    setFormCampaignSegmentIds([]);
    setDraftMessage(null);
    setCurrentDraftId(null);
  };

  const buildCampaignFromForm = (id?: string): MailingCampaign => ({
    id: id ?? currentDraftId ?? generateId(),
    name: formCampaignName.trim(),
    dateEnvoi: new Date().toISOString(),
    envoyes: 0,
    ouverts: 0,
    pctOuverture: 0,
    clics: 0,
    pctClics: 0,
    subject: formCampaignSubject.trim() || undefined,
    accroche: formCampaignAccroche.trim() || undefined,
    contentHtml: formCampaignContentHtml.trim() || undefined,
    targetSegmentIds:
      formCampaignSegmentIds.length > 0 ? formCampaignSegmentIds : undefined,
    fromEmail: selectedFromEmail || undefined
  });

  const loadCampaignInForm = (campaign: MailingCampaign) => {
    setFormCampaignName(campaign.name || "");
    setFormCampaignSubject(campaign.subject || "");
    setFormCampaignAccroche(campaign.accroche || "");
    setFormCampaignContentHtml(campaign.contentHtml || "");
    setFormCampaignSegmentIds(campaign.targetSegmentIds ?? []);
    if (campaign.fromEmail) {
      setSelectedFromEmail(campaign.fromEmail);
    }
    const isSentCampaign = campaign.envoyes > 0;
    setCurrentDraftId(isSentCampaign ? null : campaign.id);
    setActiveTab("newCampaign");
    setLoadCampaignOpen(false);
    setDraftMessage(null);
  };

  /** Enveloppe la sélection (ou insère du HTML) au curseur — vue HTML ou aperçu */
  const insertHtml = (before: string, after: string = "") => {
    if (htmlView) {
      const ta = contentHtmlRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const text = formCampaignContentHtml;
      const selected = text.slice(start, end);
      const newValue = text.slice(0, start) + before + selected + after + text.slice(end);
      const newPos = start + before.length + selected.length;
      pendingCursorRef.current = newPos;
      setFormCampaignContentHtml(newValue);
    } else {
      applyFormatInPreview(before, after);
    }
  };

  /** Gras ou souligné en mode aperçu (execCommand) */
  const applyBoldOrUnderline = (cmd: "bold" | "underline") => {
    if (htmlView) {
      insertHtml(cmd === "bold" ? "<strong>" : "<u>", cmd === "bold" ? "</strong>" : "</u>");
    } else {
      applyFormatPreviewCommand(cmd);
    }
  };

  /** En mode aperçu : enveloppe la sélection avec les balises before/after puis sync state */
  const applyFormatInPreview = (before: string, after: string) => {
    const el = contentEditableRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      const marker = "data-cursor-here";
      const toInsert = before.replace(">", " " + marker + ">") + after;
      document.execCommand("insertHTML", false, toInsert);
      const inserted = el.querySelector(`[${marker}]`);
      if (inserted) {
        (inserted as HTMLElement).removeAttribute(marker);
        const r = document.createRange();
        r.setStart(inserted, 0);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
      }
      setFormCampaignContentHtml(el.innerHTML);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;
    try {
      const fragment = range.extractContents();
      const temp = document.createElement("div");
      const placeholder = "\uFEFF";
      temp.innerHTML = before + placeholder + after;
      const wrapper = temp.firstChild as HTMLElement;
      if (!wrapper) return;
      const walk = (node: Node): Node | null => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent === placeholder) return node;
        for (let i = 0; i < node.childNodes.length; i++) {
          const found = walk(node.childNodes[i]);
          if (found) return found;
        }
        return null;
      };
      const textNode = walk(wrapper);
      if (textNode && textNode.parentNode) {
        textNode.parentNode.replaceChild(fragment, textNode);
      }
      range.insertNode(wrapper);
      setFormCampaignContentHtml(el.innerHTML);
    } catch {
      document.execCommand("insertHTML", false, before + (sel.toString() || "") + after);
      setFormCampaignContentHtml(el.innerHTML);
    }
  };

  /** Insère un bloc HTML au curseur — vue HTML ou aperçu */
  const insertAtCursor = (html: string) => {
    if (htmlView) {
      const ta = contentHtmlRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const text = formCampaignContentHtml;
      const newValue = text.slice(0, start) + html + text.slice(start);
      setFormCampaignContentHtml(newValue);
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(start + html.length, start + html.length);
      }, 0);
    } else {
      const el = contentEditableRef.current;
      if (!el) return;
      el.focus();
      document.execCommand("insertHTML", false, html);
      setFormCampaignContentHtml(el.innerHTML);
    }
  };

  /** En mode aperçu : applique gras ou souligné via execCommand */
  const applyFormatPreviewCommand = (command: "bold" | "underline") => {
    const el = contentEditableRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(command, false);
    setFormCampaignContentHtml(el.innerHTML);
  };

  const openLinkDialog = () => {
    setLinkDialogOpen(true);
  };

  const onLinkButtonMouseDown = (e: React.MouseEvent) => {
    if (htmlView) return;
    const el = contentEditableRef.current;
    if (!el) return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (el.contains(range.commonAncestorContainer)) {
        savedLinkRangeRef.current = range.cloneRange();
        e.preventDefault();
        setLinkDialogOpen(true);
      }
    }
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    const label = linkText.trim() || "Lien";
    const safeUrl = url.replace(/"/g, "&quot;");
    const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
    if (htmlView) {
      const ta = contentHtmlRef.current;
      const start = ta?.selectionStart ?? 0;
      const end = ta?.selectionEnd ?? start;
      const sel = formCampaignContentHtml.slice(start, end);
      if (sel) {
        insertHtml(`<a href="${safeUrl}">`, "</a>");
      } else {
        insertAtCursor(`<a href="${safeUrl}">${label}</a>`);
      }
    } else {
      const el = contentEditableRef.current;
      if (!el) return;
      el.focus();
      const range = savedLinkRangeRef.current;
      const rangeValid = range && el.contains(range.startContainer);
      if (rangeValid) {
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
          const text = range.collapsed ? label : range.toString();
          const linkHtml = `<a href="${safeUrl}">${escapeHtml(text)}</a>`;
          document.execCommand("insertHTML", false, linkHtml);
          setFormCampaignContentHtml(el.innerHTML);
        }
      } else {
        document.execCommand("insertHTML", false, `<a href="${safeUrl}">${escapeHtml(label)}</a>`);
        setFormCampaignContentHtml(el.innerHTML);
      }
    }
    setLinkDialogOpen(false);
    setLinkUrl("");
    setLinkText("");
    savedLinkRangeRef.current = null;
  };

  const applyImage = () => {
    const url = imageUrl.trim();
    if (!url) return;
    const alt = imageAlt.trim() || "Image";
    const tag = `<img src="${url.replace(/"/g, "&quot;")}" alt="${alt.replace(/"/g, "&quot;")}" style="max-width:100%;height:auto;" />`;
    insertAtCursor(tag);
    setImageDialogOpen(false);
    setImageUrl("");
    setImageAlt("");
  };

  const clearContactForm = () => {
    setFormContactNom("");
    setFormContactPrenom("");
    setFormContactMail("");
    setFormContactDate(new Date().toISOString().slice(0, 10));
    setFormContactSegmentIds([]);
    setEditingContactId(null);
  };

  const handleEditContact = (contact: MailingContact) => {
    setEditingContactId(contact.id);
    setFormContactNom(contact.nom === "—" ? "" : contact.nom);
    setFormContactPrenom(contact.prenom === "—" ? "" : contact.prenom);
    setFormContactMail(contact.mail);
    setFormContactDate(contact.dateAjout.slice(0, 10));
    setFormContactSegmentIds(contact.segmentIds ?? []);
    setManualContactOpen(true);
  };

  const createSegment = () => {
    const name = newSegmentName.trim();
    if (!name) return;
    const id = generateId();
    setSegments((prev) => [...prev, { id, name }]);
    setNewSegmentName("");
    setNewSegmentDialogOpen(false);
  };

  const getSegmentName = (id: string) =>
    segments.find((s) => s.id === id)?.name ?? id;

  /** Nombre de contacts appartenant à au moins un des segments donnés */
  const countContactsInSegments = (segmentIds: string[]) => {
    if (segmentIds.length === 0) return 0;
    if (segmentIds.includes(ALL_SEGMENTS_ID)) return contacts.length;
    const set = new Set(segmentIds);
    return contacts.filter((c) => c.segmentIds.some((sid) => set.has(sid)))
      .length;
  };

  /** Liste des emails des contacts appartenant aux segments donnés */
  const getEmailsForSegments = (segmentIds: string[]): string[] => {
    if (segmentIds.length === 0) return [];
    if (segmentIds.includes(ALL_SEGMENTS_ID)) {
      return contacts.map((c) => c.mail).filter((m) => m && m.includes("@"));
    }
    const set = new Set(segmentIds);
    return contacts
      .filter((c) => c.segmentIds.some((sid) => set.has(sid)))
      .map((c) => c.mail)
      .filter((m) => m && m.includes("@"));
  };

  const toggleCampaignSegment = (segmentId: string) => {
    setFormCampaignSegmentIds((prev) => {
      // Segment spécial : tous les contacts (exclusif)
      if (segmentId === ALL_SEGMENTS_ID) {
        return prev.includes(ALL_SEGMENTS_ID) ? [] : [ALL_SEGMENTS_ID];
      }
      const withoutAll = prev.filter((id) => id !== ALL_SEGMENTS_ID);
      return withoutAll.includes(segmentId)
        ? withoutAll.filter((id) => id !== segmentId)
        : [...withoutAll, segmentId];
    });
  };

  const toggleContactSegment = (segmentId: string) => {
    setFormContactSegmentIds((prev) =>
      prev.includes(segmentId)
        ? prev.filter((id) => id !== segmentId)
        : [...prev, segmentId]
    );
  };

  const handleCreateCampaignSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!formCampaignName.trim()) return;

    const draft = buildCampaignFromForm(currentDraftId ?? undefined);
    setDraftCampaigns((prev) => [draft, ...prev.filter((c) => c.id !== draft.id)]);
    setCurrentDraftId(draft.id);
    setDraftMessage("Campagne sauvegardée.");
  };

  const handleSendCampaign = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    setSendError(null);
    if (!formCampaignName.trim()) {
      setSendError("Donne un nom à la campagne.");
      return;
    }
    const recipientEmails = getEmailsForSegments(formCampaignSegmentIds);
    if (recipientEmails.length === 0) {
      setSendError("Aucun contact sélectionné. Choisis au moins un segment avec des contacts ayant une adresse mail.");
      return;
    }
    if (!selectedFromEmail) {
      setSendError("Choisis une adresse d'envoi. Connecte une adresse dans Paramètres > Configuration mail.");
      return;
    }
    const subject = formCampaignSubject.trim() || formCampaignName.trim();
    const html = formCampaignContentHtml.trim() || "<p>Aucun contenu.</p>";
    setSendLoading(true);
    const campaignId = generateId();
    try {
      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipientEmails,
          subject,
          html,
          fromEmail: selectedFromEmail,
          campaignId,
          campaignName: formCampaignName.trim(),
          accroche: formCampaignAccroche.trim() || undefined
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data.error as string) || "Erreur lors de l'envoi.");
      }
      const newCampaign: MailingCampaign = {
        id: campaignId,
        name: formCampaignName.trim(),
        dateEnvoi: new Date().toISOString(),
        envoyes: recipientEmails.length,
        ouverts: 0,
        pctOuverture: 0,
        clics: 0,
        pctClics: 0,
        subject,
        accroche: formCampaignAccroche.trim() || undefined,
        contentHtml: html,
        targetSegmentIds:
          formCampaignSegmentIds.length > 0 ? formCampaignSegmentIds : undefined,
        fromEmail: selectedFromEmail
      };
      setCampaigns((prev) => [newCampaign, ...prev]);
      if (currentDraftId) {
        setDraftCampaigns((prev) => prev.filter((d) => d.id !== currentDraftId));
      }
      clearCampaignForm();
      setActiveTab("campaigns");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Erreur lors de l'envoi.");
    } finally {
      setSendLoading(false);
    }
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formContactMail.trim() || !formContactMail.includes("@")) return;

    const contactData: Omit<MailingContact, "id"> = {
      nom: formContactNom.trim() || "—",
      prenom: formContactPrenom.trim() || "—",
      mail: formContactMail.trim(),
      dateAjout: formContactDate,
      segmentIds:
        formContactSegmentIds.length > 0
          ? formContactSegmentIds
          : [segments[0]?.id ?? "general"]
    };

    if (editingContactId) {
      // Modification
      setContacts((prev) =>
        prev.map((c) =>
          c.id === editingContactId ? { ...contactData, id: editingContactId } : c
        )
      );
    } else {
      // Nouveau contact
      setContacts((prev) => [{ ...contactData, id: generateId() }, ...prev]);
    }

    clearContactForm();
    setManualContactOpen(false);
  };

  const openImportFromContacts = () => {
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem("contacts:list")
          : null;
      if (!raw || raw === "null") {
        alert(
          "Aucun contact trouvé dans le module Contacts. Ajoutez d'abord des contacts avec une adresse email."
        );
        return;
      }
      const list: Array<{
        id: number;
        firstName: string;
        lastName: string;
        email?: string;
      }> = JSON.parse(raw);
      const withEmail = Array.isArray(list)
        ? list.filter((c) => {
            const email = (c.email ?? "").toString().trim();
            return email && email.includes("@");
          })
        : [];
      setSidekickContacts(withEmail);
      setSelectedSidekickIds(new Set());
      setImportSegmentIds([]);
      setImportFromContactsOpen(true);
    } catch {
      alert(
        "Impossible de lire les contacts. Vérifiez que le module Contacts contient des données."
      );
    }
  };

  const toggleSidekickContact = (id: number) => {
    setSelectedSidekickIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmImportFromSidekick = () => {
    const existingMails = new Set(contacts.map((c) => c.mail.toLowerCase()));
    const today = new Date().toISOString().slice(0, 10);
    const batch: Omit<MailingContact, "id">[] = [];

    for (const c of sidekickContacts) {
      if (!selectedSidekickIds.has(c.id)) continue;
      const email = (c.email ?? "").toString().trim();
      if (!email || existingMails.has(email.toLowerCase())) continue;
      existingMails.add(email.toLowerCase());

      // Le module Contacts Sidekick distingue déjà prénom / nom
      const rawFirst = (c.firstName ?? "").toString().trim();
      const rawLast = (c.lastName ?? "").toString().trim();
      const prenom = rawFirst || "—";
      const nom = rawLast || "—";

      batch.push({
        nom,
        prenom,
        mail: email,
        dateAjout: today,
        segmentIds:
          importSegmentIds.length > 0
            ? importSegmentIds
            : [segments[0]?.id ?? "general"]
      });
    }

    if (batch.length > 0) {
      setContacts((prev) => [
        ...prev,
        ...batch.map((c) => ({ ...c, id: generateId() }))
      ]);
    }

    setImportFromContactsOpen(false);
    setSelectedSidekickIds(new Set());
    setImportSegmentIds([]);
  };

  const handleDeleteContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const clearAllCampaigns = () => setCampaigns([]);
  const recentSentCampaigns = [...campaigns]
    .filter((c) => c.envoyes > 0)
    .sort((a, b) => (b.dateEnvoi || "").localeCompare(a.dateEnvoi || ""))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Mailing</h1>
        <p className="text-sm text-muted-foreground">
          Listes de diffusion, newsletters et campagnes email.
        </p>
      </div>

      {/* Onglets */}
      <div className="border-b border-border">
        <nav className="flex gap-1" aria-label="Onglets mailing">
          <button
            type="button"
            onClick={() => setActiveTab("campaigns")}
            className={`rounded-t-md border px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "campaigns"
                ? "border-b-0 border-border bg-background -mb-px"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Historique des campagnes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("newCampaign")}
            className={`rounded-t-md border px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "newCampaign"
                ? "border-b-0 border-border bg-background -mb-px"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Nouvelle campagne
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("contacts")}
            className={`rounded-t-md border px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "contacts"
                ? "border-b-0 border-border bg-background -mb-px"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Liste de diffusion
          </button>
        </nav>
      </div>

      {/* Historique des campagnes */}
      {activeTab === "campaigns" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Campagnes</CardTitle>
              <p className="text-sm text-muted-foreground">
                Toutes les campagnes enregistrées.
              </p>
            </div>
            {campaigns.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearAllCampaigns}
              >
                Vider l&apos;historique
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Nom</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Date d&apos;envoi
                    </th>
                    <th className="px-4 py-3 text-right font-medium">Envoyés</th>
                    <th className="px-4 py-3 text-right font-medium">Ouverts</th>
                    <th className="px-4 py-3 text-right font-medium">
                      % ouverture
                    </th>
                    <th className="px-4 py-3 text-right font-medium">Clics</th>
                    <th className="px-4 py-3 text-right font-medium">% clics</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        Aucune campagne pour le moment.
                      </td>
                    </tr>
                  ) : (
                    campaigns.map((c) => {
                      const stats = campaignStats[c.id];
                      const ouverts = stats?.ouverts ?? c.ouverts;
                      const pctOuverture = stats?.pctOuverture ?? c.pctOuverture;
                      const clics = stats?.clics ?? c.clics;
                      const pctClics = stats?.pctClics ?? c.pctClics;
                      return (
                      <tr
                        key={c.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-4 py-3">{c.name}</td>
                        <td className="px-4 py-3">
                          {c.dateEnvoi
                            ? isoToFr(c.dateEnvoi.slice(0, 10))
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">{c.envoyes}</td>
                        <td className="px-4 py-3 text-right">{ouverts}</td>
                        <td className="px-4 py-3 text-right">
                          {pctOuverture} %
                        </td>
                        <td className="px-4 py-3 text-right">{clics}</td>
                        <td className="px-4 py-3 text-right">
                          {pctClics} %
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Nouvelle campagne */}
      {activeTab === "newCampaign" && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="text-base">Nouvelle campagne</CardTitle>
              <p className="text-sm text-muted-foreground">
                Créez une nouvelle campagne email, choisissez les segments et
                rédigez votre contenu.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setLoadCampaignOpen(true)}>
              <FolderOpen className="mr-2 h-4 w-4" />
              Charger une campagne existante
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCampaignSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Nom de la campagne</Label>
                <Input
                  id="campaign-name"
                  value={formCampaignName}
                  onChange={(e) => setFormCampaignName(e.target.value)}
                  placeholder="Ex: Newsletter janvier 2025"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-subject">Objet de l&apos;email</Label>
                <Input
                  id="campaign-subject"
                  value={formCampaignSubject}
                  onChange={(e) => setFormCampaignSubject(e.target.value)}
                  placeholder="Ex: Votre actualité du mois"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-accroche">Accroche</Label>
                <Input
                  id="campaign-accroche"
                  value={formCampaignAccroche}
                  onChange={(e) => setFormCampaignAccroche(e.target.value)}
                  placeholder="Courte accroche (optionnel)"
                />
              </div>
              <div className="space-y-2">
                <Label>Adresse d&apos;envoi</Label>
                {connectedAddresses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucune adresse connectée.{" "}
                    <a href="/settings/mail" className="text-primary underline hover:no-underline">
                      Connecter Gmail ou Outlook
                    </a>
                  </p>
                ) : (
                  <div className="flex items-center gap-2 max-w-md">
                    <Select
                      value={selectedFromEmail}
                      onValueChange={setSelectedFromEmail}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choisir une adresse" />
                      </SelectTrigger>
                      <SelectContent>
                        {connectedAddresses.map((email) => (
                          <SelectItem key={email} value={email}>
                            {email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" asChild title="Ouvrir Configuration mail">
                      <a href="/settings/mail" aria-label="Ouvrir Configuration mail">
                        <Settings className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Envoyer à (segments)</Label>
                <p className="text-xs text-muted-foreground">
                  Sélectionnez les segments de contacts qui recevront l&apos;email.
                </p>
                <div className="flex flex-wrap gap-2 rounded-md border border-input p-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded border px-2 py-1 text-sm hover:bg-muted/50">
                    <Checkbox
                      checked={formCampaignSegmentIds.includes(ALL_SEGMENTS_ID)}
                      onCheckedChange={() =>
                        toggleCampaignSegment(ALL_SEGMENTS_ID)
                      }
                    />
                    Tous les contacts
                  </label>
                  {segments.map((seg) => (
                    <label
                      key={seg.id}
                      className="flex cursor-pointer items-center gap-2 rounded border px-2 py-1 text-sm hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={formCampaignSegmentIds.includes(seg.id)}
                        onCheckedChange={() => toggleCampaignSegment(seg.id)}
                      />
                      {seg.name}
                    </label>
                  ))}
                </div>
                {formCampaignSegmentIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {countContactsInSegments(formCampaignSegmentIds)} contact(s)
                    concerné(s).
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Contenu de l&apos;email</Label>
                <div className="rounded-md border border-input overflow-hidden">
                  <div className="flex flex-wrap items-center gap-1 border-b border-input bg-muted/40 px-2 py-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0"
                      title="Gras"
                      onClick={() => applyBoldOrUnderline("bold")}
                    >
                      <Bold className="h-5 w-5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0"
                      title="Souligné"
                      onClick={() => applyBoldOrUnderline("underline")}
                    >
                      <Underline className="h-5 w-5" />
                    </Button>
                    <div className="w-px h-5 bg-border mx-0.5" />
                    <Select
                      value={currentFontSize}
                      onValueChange={(v) => {
                        setCurrentFontSize(v);
                        if (htmlView) {
                          insertHtml(`<span style="font-size:${v};">`, "</span>");
                        } else {
                          const el = contentEditableRef.current;
                          if (!el) return;
                          el.focus();
                          const sizeMap: Record<string, string> = {
                            "12px": "2",
                            "14px": "3",
                            "16px": "4",
                            "18px": "5",
                            "20px": "6",
                            "24px": "7"
                          };
                          const n = sizeMap[v] ?? "4";
                          document.execCommand("fontSize", false, n);
                          setFormCampaignContentHtml(el.innerHTML);
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 w-[100px] border-0 bg-transparent shadow-none text-sm">
                        <SelectValue placeholder="Taille" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12px">12px</SelectItem>
                        <SelectItem value="14px">14px</SelectItem>
                        <SelectItem value="16px">16px</SelectItem>
                        <SelectItem value="18px">18px</SelectItem>
                        <SelectItem value="20px">20px</SelectItem>
                        <SelectItem value="24px">24px</SelectItem>
                      </SelectContent>
                    </Select>
                    <DropdownMenu open={colorMenuOpen} onOpenChange={setColorMenuOpen}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 gap-1.5 px-2"
                          title="Couleur"
                        >
                          <span
                            className="h-5 w-5 rounded border border-border"
                            style={{ backgroundColor: "#666666" }}
                          />
                          <span className="text-sm">Couleur</span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        side="bottom"
                        align="start"
                        alignOffset={0}
                        sideOffset={4}
                        className="p-2"
                      >
                        <div className="flex flex-row flex-wrap gap-1.5">
                          {EMAIL_COLORS.map(({ value, label }) => (
                            <button
                              key={value}
                              type="button"
                              title={label}
                              className="h-7 w-7 rounded border border-border shadow-sm transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring"
                              style={{ backgroundColor: value }}
                              onClick={() => {
                                if (htmlView) {
                                  insertHtml(`<span style="color:${value};">`, "</span>");
                                } else {
                                  const el = contentEditableRef.current;
                                  if (!el) return;
                                  el.focus();
                                  document.execCommand("foreColor", false, value);
                                  setFormCampaignContentHtml(el.innerHTML);
                                }
                                setColorMenuOpen(false);
                              }}
                            />
                          ))}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="w-px h-5 bg-border mx-0.5" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0"
                      title="Ajouter un lien"
                      onMouseDown={onLinkButtonMouseDown}
                      onClick={openLinkDialog}
                    >
                      <LinkIcon className="h-5 w-5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0"
                      title="Ajouter une image"
                      onClick={() => setImageDialogOpen(true)}
                    >
                      <Image className="h-5 w-5" />
                    </Button>
                    <div className="ml-auto flex items-center gap-3 rounded-md border border-border bg-background px-3 py-1.5">
                      <span className="text-sm font-medium text-foreground">HTML</span>
                      <Switch
                        checked={htmlView}
                        onCheckedChange={setHtmlView}
                        className="!bg-[#a3a3a3] data-[state=checked]:!bg-[#262626] dark:!bg-[#525252] dark:data-[state=checked]:!bg-[#e5e5e5]"
                      />
                    </div>
                  </div>
                  {htmlView ? (
                    <textarea
                      ref={contentHtmlRef}
                      value={formCampaignContentHtml}
                      onChange={(e) => setFormCampaignContentHtml(e.target.value)}
                      placeholder="<p>Bonjour,</p><p>Votre contenu ici...</p>"
                      className="min-h-[280px] w-full bg-background px-3 py-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-0"
                    />
                  ) : (
                    <div
                      ref={contentEditableRef}
                      contentEditable
                      suppressContentEditableWarning
                      className="min-h-[280px] w-full bg-background px-4 py-3 text-sm overflow-auto break-words focus-visible:outline-none [&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_p]:mb-2"
                      onInput={(e) => {
                        const html = (e.currentTarget as HTMLDivElement).innerHTML;
                        setFormCampaignContentHtml(html);
                      }}
                      onBlur={(e) => {
                        setFormCampaignContentHtml((e.currentTarget as HTMLDivElement).innerHTML);
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Dialog Lien */}
              <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Ajouter un lien</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="link-url">URL du lien</Label>
                      <Input
                        id="link-url"
                        type="url"
                        placeholder="https://..."
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="link-text">Texte du lien (si rien n&apos;est sélectionné)</Label>
                      <Input
                        id="link-text"
                        placeholder="Lien"
                        value={linkText}
                        onChange={(e) => setLinkText(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setLinkDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="button" onClick={applyLink} disabled={!linkUrl.trim()}>
                      Insérer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Dialog Image */}
              <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Ajouter une image</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="image-url">URL de l&apos;image</Label>
                      <Input
                        id="image-url"
                        type="url"
                        placeholder="https://..."
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="image-alt">Texte alternatif (alt)</Label>
                      <Input
                        id="image-alt"
                        placeholder="Description de l'image"
                        value={imageAlt}
                        onChange={(e) => setImageAlt(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setImageDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="button" onClick={applyImage} disabled={!imageUrl.trim()}>
                      Insérer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {sendError && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {sendError}
                </div>
              )}
              {draftMessage && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
                  {draftMessage}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearCampaignForm}
                  disabled={sendLoading}
                >
                  Réinitialiser
                </Button>
                <Button type="submit" variant="outline" disabled={sendLoading}>
                  Sauvegarder pour plus tard
                </Button>
                <Button
                  type="button"
                  onClick={handleSendCampaign}
                  disabled={sendLoading || connectedAddresses.length === 0}
                >
                  {sendLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi en cours…
                    </>
                  ) : (
                    "Envoyer"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Dialog open={loadCampaignOpen} onOpenChange={setLoadCampaignOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Charger une campagne existante</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="inline-flex rounded-md border bg-background p-0.5">
              <Button
                type="button"
                size="sm"
                variant={loadCampaignTab === "saved" ? "default" : "ghost"}
                onClick={() => setLoadCampaignTab("saved")}
              >
                Campagnes sauvegardées
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant={loadCampaignTab === "sent" ? "default" : "ghost"}
                      onClick={() => setLoadCampaignTab("sent")}
                    >
                      Campagnes envoyées
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Tes 10 dernières campagnes envoyées sont sauvegardées ici.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {loadCampaignTab === "saved" ? (
              <div className="max-h-80 overflow-auto rounded-md border">
                {draftCampaigns.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted-foreground">
                    Aucune campagne sauvegardée.
                  </p>
                ) : (
                  <div className="divide-y">
                    {draftCampaigns.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{c.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {c.subject || "Sans objet"} · {isoToFr((c.dateEnvoi || "").slice(0, 10))}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => loadCampaignInForm(c)}>
                            Utiliser
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() =>
                              setDraftCampaigns((prev) => prev.filter((draft) => draft.id !== c.id))
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="max-h-80 overflow-auto rounded-md border">
                {recentSentCampaigns.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted-foreground">
                    Aucune campagne envoyée.
                  </p>
                ) : (
                  <div className="divide-y">
                    {recentSentCampaigns.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{c.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {c.subject || "Sans objet"} · envoyée le {isoToFr((c.dateEnvoi || "").slice(0, 10))}
                          </p>
                        </div>
                        <Button type="button" size="sm" variant="outline" onClick={() => loadCampaignInForm(c)}>
                          Utiliser
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLoadCampaignOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contacts / listes */}
      {activeTab === "contacts" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Contacts</CardTitle>
              <p className="text-sm text-muted-foreground">
                Gérer les contacts et segments de vos listes.
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  Nouveau
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    // TODO: Implémenter l'import CSV plus tard
                    alert("Import CSV à venir prochainement");
                  }}
                  disabled
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  Depuis un fichier CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openImportFromContacts}>
                  <Users className="mr-2 h-4 w-4" />
                  Depuis le module Contacts Sidekick
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setManualContactOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Ajout manuel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>

            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Nom</th>
                    <th className="px-4 py-3 text-left font-medium">Prénom</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Date d&apos;ajout
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Segments</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        Aucun contact. Utilisez le bouton &quot;Nouveau&quot; pour en ajouter.
                      </td>
                    </tr>
                  ) : (
                    contacts.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-4 py-3">{c.nom}</td>
                        <td className="px-4 py-3">{c.prenom}</td>
                        <td className="px-4 py-3">{c.mail}</td>
                        <td className="px-4 py-3">
                          {isoToFr(c.dateAjout.slice(0, 10))}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {c.segmentIds.length === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              c.segmentIds.map((sid) => (
                                <span
                                  key={sid}
                                  className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                                >
                                  {getSegmentName(sid)}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditContact(c)}
                              aria-label="Modifier le contact"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                              onClick={() => handleDeleteContact(c.id)}
                              aria-label="Supprimer le contact"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog Ajout/Modification manuel */}
      <Dialog
        open={manualContactOpen}
        onOpenChange={(open) => {
          if (!open) {
            clearContactForm();
          }
          setManualContactOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingContactId ? "Modifier le contact" : "Ajout manuel"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddContact} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-nom">Nom</Label>
              <Input
                id="contact-nom"
                value={formContactNom}
                onChange={(e) => setFormContactNom(e.target.value)}
                placeholder="Nom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-prenom">Prénom</Label>
              <Input
                id="contact-prenom"
                value={formContactPrenom}
                onChange={(e) => setFormContactPrenom(e.target.value)}
                placeholder="Prénom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-mail">Email *</Label>
              <Input
                id="contact-mail"
                type="email"
                value={formContactMail}
                onChange={(e) => setFormContactMail(e.target.value)}
                placeholder="email@exemple.fr"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-date">Date d&apos;ajout</Label>
              <Input
                id="contact-date"
                type="date"
                value={formContactDate}
                onChange={(e) => setFormContactDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Segments</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setNewSegmentDialogOpen(true)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Nouveau segment
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 rounded-md border border-input p-2">
                {segments.map((seg) => (
                  <label
                    key={seg.id}
                    className="flex cursor-pointer items-center gap-2 rounded border px-2 py-1 text-sm hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={formContactSegmentIds.includes(seg.id)}
                      onCheckedChange={() => toggleContactSegment(seg.id)}
                    />
                    {seg.name}
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  clearContactForm();
                  setManualContactOpen(false);
                }}
              >
                Annuler
              </Button>
              <Button type="submit">
                {editingContactId ? "Modifier" : "Ajouter le contact"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Import depuis Contacts Sidekick */}
      <Dialog
        open={importFromContactsOpen}
        onOpenChange={setImportFromContactsOpen}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Importer depuis le module Contacts</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Sélectionnez les contacts à ajouter à la liste de diffusion.
              Optionnellement, assignez-les à un ou plusieurs segments.
            </p>
          </DialogHeader>
          <div className="space-y-4">
            {sidekickContacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun contact avec adresse email dans le module Contacts.
              </p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelectedSidekickIds(
                        new Set(sidekickContacts.map((c) => c.id))
                      )
                    }
                  >
                    Tout sélectionner
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSidekickIds(new Set())}
                  >
                    Tout désélectionner
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {selectedSidekickIds.size} sélectionné(s)
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto rounded-md border border-border">
                  <ul className="divide-y divide-border">
                    {sidekickContacts.map((c) => {
                      const email = (c.email ?? "").toString().trim();
                      const fullName = `${c.firstName ?? ""} ${c.lastName ?? ""}`
                        .trim() || "—";
                      return (
                        <li
                          key={c.id}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={selectedSidekickIds.has(c.id)}
                            onCheckedChange={() => toggleSidekickContact(c.id)}
                          />
                          <label
                            className="flex flex-1 cursor-pointer items-center justify-between gap-2 text-sm"
                          >
                            <span className="font-medium">{fullName}</span>
                            <span className="text-muted-foreground">{email}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Ajouter à des segments (optionnel)</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewSegmentDialogOpen(true)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Nouveau segment
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 rounded-md border border-input p-2">
                    {segments.map((seg) => (
                      <label
                        key={seg.id}
                        className="flex cursor-pointer items-center gap-2 rounded border px-2 py-1 text-sm hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={importSegmentIds.includes(seg.id)}
                          onCheckedChange={() => {
                            setImportSegmentIds((prev) =>
                              prev.includes(seg.id)
                                ? prev.filter((id) => id !== seg.id)
                                : [...prev, seg.id]
                            );
                          }}
                        />
                        {seg.name}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportFromContactsOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={confirmImportFromSidekick}
              disabled={
                sidekickContacts.length === 0 ||
                selectedSidekickIds.size === 0
              }
            >
              Importer {selectedSidekickIds.size > 0 ? selectedSidekickIds.size : ""}{" "}
              contact(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Nouveau segment */}
      <Dialog
        open={newSegmentDialogOpen}
        onOpenChange={setNewSegmentDialogOpen}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Créer un segment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-segment-name">Nom du segment</Label>
              <Input
                id="new-segment-name"
                value={newSegmentName}
                onChange={(e) => setNewSegmentName(e.target.value)}
                placeholder="Ex: Presse, Fans, Partenaires"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    createSegment();
                  }
                }}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setNewSegmentName("");
                  setNewSegmentDialogOpen(false);
                }}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={createSegment}
                disabled={!newSegmentName.trim()}
              >
                Créer
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}