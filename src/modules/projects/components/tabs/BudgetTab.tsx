"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, Pencil, Check, X, ExternalLink, MoreHorizontal } from "lucide-react";
import type { Project } from "@/lib/sidekick-store";
import { useProjectBudgetData } from "@/hooks/useProjectBudgetData";
import type { BudgetLine, ProjectExpense } from "@/hooks/useProjectBudgetData";
import { DatePicker } from "@/components/ui/date-picker";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_FR = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "août", "sep", "oct", "nov", "déc"];

function isoToShort(iso: string): string {
  if (!iso) return "—";
  const [, m, d] = iso.split("-");
  if (!m || !d) return iso;
  return `${d} - ${MONTHS_FR[parseInt(m, 10) - 1] ?? m}`;
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR",
    minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(n);
}

const INPUT = "h-7 text-[12px] bg-[#1a1a1a] border border-[rgba(245,245,245,0.12)] text-[#F5F5F5] px-2 rounded-sm placeholder:text-[#F5F5F5]/40 focus:outline-none focus:border-[#F0FF00]/40";

// ─── Context menu ──────────────────────────────────────────────────────────────

function ContextMenu({
  x, y, onRename, onDelete, onClose,
}: {
  x: number; y: number;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-[#1c1c1e] border border-[rgba(245,245,245,0.15)] rounded-lg shadow-xl py-1 min-w-[140px] text-[13px]"
      style={{ top: y, left: x }}
    >
      <button
        onClick={() => { onRename(); onClose(); }}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-[#F5F5F5]/80 hover:bg-[rgba(245,245,245,0.08)] transition-colors"
      >
        <Pencil size={12} className="text-[#F5F5F5]/40" /> Renommer
      </button>
      <div className="h-px bg-[rgba(245,245,245,0.08)] mx-1 my-0.5" />
      <button
        onClick={() => { onDelete(); onClose(); }}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-red-400 hover:bg-[rgba(220,38,38,0.1)] transition-colors"
      >
        <Trash2 size={12} className="text-red-400/60" /> Supprimer
      </button>
    </div>
  );
}

// ─── KPI strip ────────────────────────────────────────────────────────────────

function KpiStrip({ chargesLabel, chargesValue, revenusLabel, revenusValue, balance }: {
  chargesLabel: string; chargesValue: number;
  revenusLabel: string; revenusValue: number;
  balance: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-px rounded-xl overflow-hidden border border-[rgba(245,245,245,0.1)] bg-[rgba(245,245,245,0.06)]">
      {[
        { label: chargesLabel, value: chargesValue, cls: "text-[#F5F5F5]/80" },
        { label: revenusLabel, value: revenusValue, cls: "text-green-400" },
        { label: "Solde", value: balance, cls: balance >= 0 ? "text-green-400" : "text-red-400" },
      ].map(({ label, value, cls }) => (
        <div key={label} className="bg-[#101010] px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-[#F5F5F5]/35 mb-0.5">{label}</p>
          <p className={cn("text-lg font-semibold tabular-nums", cls)}>
            {label === "Solde" && value >= 0 ? "+" : ""}{fmt(value)}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Column header ─────────────────────────────────────────────────────────────

function ColHeader({ title, isCharge }: { title: string; isCharge: boolean }) {
  return (
    <div className={cn(
      "px-3 py-2 rounded-t-lg border-b-2 text-[11px] font-semibold uppercase tracking-wider",
      isCharge ? "bg-[rgba(220,38,38,0.08)] border-red-500/30 text-red-400"
               : "bg-[rgba(74,222,128,0.06)] border-green-500/30 text-green-400",
    )}>{title}</div>
  );
}

function TotalRow({ label, amount, isCharge }: { label: string; amount: number; isCharge: boolean }) {
  return (
    <div className={cn(
      "flex items-center justify-between px-3 py-2 border-t-2 font-semibold text-[12px]",
      isCharge ? "border-red-500/20 text-red-400/70" : "border-green-500/20 text-green-400/70",
    )}>
      <span>{label}</span>
      <span className="tabular-nums">{fmt(amount)}</span>
    </div>
  );
}

// ─── Inline line editor (shared) ───────────────────────────────────────────────

function LineRead({ label, right, onEdit, onDelete }: {
  label: string; right: React.ReactNode; onEdit?: () => void; onDelete?: () => void;
}) {
  return (
    <div className="group flex items-center gap-2 pl-7 pr-2 py-1.5 hover:bg-[rgba(245,245,245,0.03)] border-b border-[rgba(245,245,245,0.04)] last:border-0">
      <span className="flex-1 text-[13px] text-[#F5F5F5]/70 truncate min-w-0">{label}</span>
      {right}
      {(onEdit || onDelete) && <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity">
        {onEdit && <button onClick={onEdit} className="text-[#F5F5F5]/30 hover:text-[#F5F5F5] p-0.5"><Pencil size={11} /></button>}
        {onDelete && <button onClick={onDelete} className="text-[#F5F5F5]/20 hover:text-red-400 p-0.5"><Trash2 size={11} /></button>}
      </div>}
    </div>
  );
}

// ─── Add line form (shared) ────────────────────────────────────────────────────

function AddLineBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 pl-7 pr-2 py-1.5 w-full text-[11px] text-[#F5F5F5]/20 hover:text-[#F0FF00] transition-colors border-t border-[rgba(245,245,245,0.04)]">
      <Plus size={11} /> {label}
    </button>
  );
}

// ─── Category header (named) ───────────────────────────────────────────────────

function CategoryHeader({
  name, subtotal, isCharge, collapsed,
  onToggle, onStartRename, onDelete,
}: {
  name: string; subtotal: number; isCharge: boolean; collapsed: boolean;
  onToggle: () => void; onStartRename: () => void; onDelete: () => void;
}) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const requestDelete = async () => {
    const ok = await confirm({
      title: `Supprimer la catégorie « ${name} » ?`,
      description: "Toutes les lignes de cette catégorie seront supprimées avec elle.",
    });
    if (ok) onDelete();
  };

  const openMenu = useCallback((x: number, y: number) => setMenu({ x, y }), []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    openMenu(e.clientX, e.clientY);
  };

  const handleMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    openMenu(rect.left, rect.bottom + 4);
  };

  return (
    <>
      <div
        className={cn(
          "group flex items-center gap-1.5 px-2 py-1.5 cursor-pointer select-none",
          isCharge ? "bg-[rgba(220,38,38,0.06)] hover:bg-[rgba(220,38,38,0.09)]"
                   : "bg-[rgba(74,222,128,0.04)] hover:bg-[rgba(74,222,128,0.06)]",
        )}
        onContextMenu={handleContextMenu}
        onClick={onToggle}
      >
        <span className="shrink-0 text-[#F5F5F5]/30">
          {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
        </span>
        <span className={cn(
          "flex-1 text-[11px] font-semibold uppercase tracking-wider truncate",
          isCharge ? "text-red-400/70" : "text-green-400/70",
        )}>
          {name}
        </span>
        {subtotal > 0 && (
          <span className="text-[11px] tabular-nums text-[#F5F5F5]/30 shrink-0">{fmt(subtotal)}</span>
        )}
        <button
          onClick={handleMoreClick}
          className="shrink-0 p-0.5 text-[#F5F5F5]/20 hover:text-[#F5F5F5]/60 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreHorizontal size={13} />
        </button>
      </div>

      {menu && (
        <ContextMenu
          x={menu.x} y={menu.y}
          onRename={onStartRename}
          onDelete={() => void requestDelete()}
          onClose={() => setMenu(null)}
        />
      )}
      {confirmDialog}
    </>
  );
}

// ─── Budget category panel ─────────────────────────────────────────────────────

function BudgetCategoryPanel({
  catName, lines, isCharge, projectId, kind,
  onUpdate, onDelete, onAddLine, onRename, onDeleteCat,
}: {
  catName: string;
  lines: BudgetLine[];
  isCharge: boolean;
  projectId: string;
  kind: "expense" | "income";
  onUpdate: (l: BudgetLine) => void;
  onDelete: (id: string) => void;
  onAddLine: (l: BudgetLine) => void;
  onRename: (oldName: string, newName: string) => void;
  onDeleteCat: (name: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(catName);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addLabel, setAddLabel] = useState("");
  const [addAmount, setAddAmount] = useState("");

  const subtotal = lines.reduce((s, l) => s + l.amountPlanned, 0);

  const confirmRename = () => {
    const next = renameVal.trim();
    if (!next || next === catName) { setRenaming(false); return; }
    onRename(catName, next);
    setRenaming(false);
  };

  const commitAdd = () => {
    if (!addLabel.trim() || !addAmount) return;
    onAddLine({ id: crypto.randomUUID(), projectId, kind, category: catName, label: addLabel.trim(), amountPlanned: parseFloat(addAmount) || 0 });
    setAddLabel(""); setAddAmount(""); setAddOpen(false);
  };

  return (
    <div className="border-b border-[rgba(245,245,245,0.05)] last:border-0">
      {renaming ? (
        <div className={cn("flex items-center gap-1.5 px-2 py-1.5",
          isCharge ? "bg-[rgba(220,38,38,0.06)]" : "bg-[rgba(74,222,128,0.04)]")}>
          <input value={renameVal} onChange={e => setRenameVal(e.target.value)}
            className={cn(INPUT, "flex-1 min-w-0 font-medium")} autoFocus
            onKeyDown={e => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") setRenaming(false); }} />
          <button onClick={confirmRename} className="text-green-400 hover:text-green-300 p-0.5 shrink-0"><Check size={12} /></button>
          <button onClick={() => setRenaming(false)} className="text-[#F5F5F5]/30 hover:text-[#F5F5F5] p-0.5 shrink-0"><X size={12} /></button>
        </div>
      ) : (
        <CategoryHeader
          name={catName} subtotal={subtotal} isCharge={isCharge} collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
          onStartRename={() => { setRenameVal(catName); setRenaming(true); }}
          onDelete={() => onDeleteCat(catName)}
        />
      )}

      {!collapsed && (
        <>
          {lines.length === 0 && (
            <p className="pl-7 pr-2 py-2 text-[11px] text-[#F5F5F5]/20 italic">Vide</p>
          )}
          {lines.map(line =>
            editingId === line.id ? (
              <div key={line.id} className="flex items-center gap-1.5 pl-7 pr-2 py-1.5 bg-[rgba(245,245,245,0.04)]">
                <input value={line.label} onChange={e => onUpdate({ ...line, label: e.target.value })}
                  className={cn(INPUT, "flex-1 min-w-0")} style={{ width: 0 }} autoFocus
                  onKeyDown={e => e.key === "Enter" && setEditingId(null)} />
                <input
                  defaultValue={String(line.amountPlanned)}
                  onBlur={e => onUpdate({ ...line, amountPlanned: parseFloat(e.target.value) || 0 })}
                  type="number" min="0" step="0.01"
                  className={cn(INPUT, "shrink-0 tabular-nums text-right")} style={{ width: 64 }}
                  onKeyDown={e => e.key === "Enter" && setEditingId(null)} />
                <button onClick={() => setEditingId(null)} className="text-green-400 hover:text-green-300 p-0.5 shrink-0"><Check size={13} /></button>
              </div>
            ) : (
              <LineRead
                key={line.id} label={line.label}
                right={<span className="text-[12px] tabular-nums text-[#F5F5F5]/50 shrink-0">{fmt(line.amountPlanned)}</span>}
                onEdit={() => setEditingId(line.id)}
                onDelete={() => onDelete(line.id)}
              />
            )
          )}
          {addOpen ? (
            <div className="flex items-center gap-1.5 pl-7 pr-2 py-1.5 bg-[rgba(240,255,0,0.02)] border-t border-[rgba(245,245,245,0.05)]">
              <input value={addLabel} onChange={e => setAddLabel(e.target.value)} placeholder="Libellé"
                className={cn(INPUT, "flex-1 min-w-0")} style={{ width: 0 }} autoFocus
                onKeyDown={e => e.key === "Enter" && commitAdd()} />
              <input value={addAmount} onChange={e => setAddAmount(e.target.value)} type="number" min="0" step="0.01"
                placeholder="0 €" className={cn(INPUT, "shrink-0 tabular-nums text-right")} style={{ width: 64 }}
                onKeyDown={e => e.key === "Enter" && commitAdd()} />
              <button onClick={commitAdd} className="text-green-400 hover:text-green-300 p-0.5 shrink-0"><Check size={13} /></button>
              <button onClick={() => setAddOpen(false)} className="text-[#F5F5F5]/30 hover:text-[#F5F5F5] p-0.5 shrink-0"><X size={13} /></button>
            </div>
          ) : (
            <AddLineBtn label="Ajouter une ligne" onClick={() => setAddOpen(true)} />
          )}
        </>
      )}
    </div>
  );
}

// ─── "Sans catégorie" base panel ───────────────────────────────────────────────

function UncategorizedPanel<T extends { id: string; label: string }>({
  items, isCharge, addLabel, renderAmount,
  onDelete, renderEditRow, onAdd,
}: {
  items: T[];
  isCharge: boolean;
  addLabel: string;
  renderAmount: (item: T) => React.ReactNode;
  onDelete: (id: string) => void;
  renderEditRow: (item: T, onDone: () => void) => React.ReactNode;
  onAdd: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="border-b border-[rgba(245,245,245,0.05)] last:border-0">
      <div
        className={cn(
          "flex items-center gap-1.5 px-2 py-1.5 cursor-pointer select-none",
          isCharge ? "bg-[rgba(245,245,245,0.03)]" : "bg-[rgba(245,245,245,0.02)]",
        )}
        onClick={() => setCollapsed(c => !c)}
      >
        <span className="shrink-0 text-[#F5F5F5]/20">
          {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
        </span>
        <span className="flex-1 text-[11px] font-medium text-[#F5F5F5]/30 uppercase tracking-wider">
          Sans catégorie
        </span>
      </div>
      {!collapsed && (
        <>
          {items.map(item =>
            editingId === item.id ? (
              <div key={item.id}>{renderEditRow(item, () => setEditingId(null))}</div>
            ) : (
              <LineRead
                key={item.id} label={item.label}
                right={renderAmount(item)}
                onEdit={() => setEditingId(item.id)}
                onDelete={() => onDelete(item.id)}
              />
            )
          )}
          <AddLineBtn label={addLabel} onClick={onAdd} />
        </>
      )}
    </div>
  );
}

// ─── Pending new category ──────────────────────────────────────────────────────

function PendingCategory({
  isCharge, kind, projectId, onAddLine, onCancel,
}: {
  isCharge: boolean;
  kind: "expense" | "income";
  projectId: string;
  onAddLine: (l: BudgetLine, catName: string) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<"name" | "line">("name");
  const [catName, setCatName] = useState("");
  const [addLabel, setAddLabel] = useState("");
  const [addAmount, setAddAmount] = useState("");

  const confirmName = () => {
    if (!catName.trim()) return;
    setStep("line");
  };

  const commitLine = () => {
    if (!addLabel.trim() || !addAmount) return;
    onAddLine({
      id: crypto.randomUUID(), projectId, kind,
      category: catName.trim(), label: addLabel.trim(),
      amountPlanned: parseFloat(addAmount) || 0,
    }, catName.trim());
  };

  const headerBg = isCharge ? "bg-[rgba(220,38,38,0.06)]" : "bg-[rgba(74,222,128,0.04)]";
  const textCls = isCharge ? "text-red-400/70" : "text-green-400/70";

  return (
    <div className="border-b border-[rgba(245,245,245,0.05)]">
      {/* Category name input */}
      <div className={cn("flex items-center gap-1.5 px-2 py-1.5", headerBg)}>
        <ChevronDown size={13} className="text-[#F5F5F5]/30 shrink-0" />
        {step === "name" ? (
          <>
            <input
              value={catName}
              onChange={e => setCatName(e.target.value)}
              placeholder="Nom de la catégorie"
              className={cn(INPUT, "flex-1 min-w-0 font-semibold", textCls)}
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") confirmName(); if (e.key === "Escape") onCancel(); }}
            />
            <button onClick={confirmName} className="text-green-400 hover:text-green-300 p-0.5 shrink-0"><Check size={12} /></button>
            <button onClick={onCancel} className="text-[#F5F5F5]/30 hover:text-[#F5F5F5] p-0.5 shrink-0"><X size={12} /></button>
          </>
        ) : (
          <span className={cn("flex-1 text-[11px] font-semibold uppercase tracking-wider", textCls)}>
            {catName}
          </span>
        )}
      </div>

      {/* First line input (after name confirmed) */}
      {step === "line" && (
        <div className="flex items-center gap-1.5 pl-7 pr-2 py-1.5 bg-[rgba(240,255,0,0.02)] border-t border-[rgba(245,245,245,0.05)]">
          <input value={addLabel} onChange={e => setAddLabel(e.target.value)} placeholder="Libellé"
            className={cn(INPUT, "flex-1 min-w-0")} style={{ width: 0 }} autoFocus
            onKeyDown={e => e.key === "Enter" && commitLine()} />
          <input value={addAmount} onChange={e => setAddAmount(e.target.value)} type="number" min="0" step="0.01"
            placeholder="0 €" className={cn(INPUT, "shrink-0 tabular-nums text-right")} style={{ width: 64 }}
            onKeyDown={e => e.key === "Enter" && commitLine()} />
          <button onClick={commitLine} className="text-green-400 hover:text-green-300 p-0.5 shrink-0"><Check size={13} /></button>
          <button onClick={onCancel} className="text-[#F5F5F5]/30 hover:text-[#F5F5F5] p-0.5 shrink-0"><X size={13} /></button>
        </div>
      )}
    </div>
  );
}

// ─── Budget column ─────────────────────────────────────────────────────────────

function BudgetColumn({
  lines, isCharge, projectId, kind, total,
  onUpdate, onDelete, onAddLine,
}: {
  lines: BudgetLine[];
  isCharge: boolean;
  projectId: string;
  kind: "expense" | "income";
  total: number;
  onUpdate: (l: BudgetLine) => void;
  onDelete: (id: string) => void;
  onAddLine: (l: BudgetLine) => void;
}) {
  const [pendingCats, setPendingCats] = useState<string[]>([]);
  const [uncatAddOpen, setUncatAddOpen] = useState(false);
  const [uncatLabel, setUncatLabel] = useState("");
  const [uncatAmount, setUncatAmount] = useState("");

  const namedLines = lines.filter(l => l.category?.trim());
  const uncatLines = lines.filter(l => !l.category?.trim());

  // Group by category name, sorted
  const groups = new Map<string, BudgetLine[]>();
  for (const l of namedLines) {
    const k = l.category.trim();
    groups.set(k, [...(groups.get(k) ?? []), l]);
  }
  const sortedCats = [...groups.keys()].sort((a, b) => a.localeCompare(b));

  const handleRename = (oldName: string, newName: string) => {
    lines.filter(l => l.category?.trim() === oldName)
      .forEach(l => onUpdate({ ...l, category: newName }));
  };

  const handleDeleteCat = (catName: string) => {
    lines.filter(l => l.category?.trim() === catName)
      .forEach(l => onDelete(l.id));
  };

  const commitUncat = () => {
    if (!uncatLabel.trim() || !uncatAmount) return;
    onAddLine({ id: crypto.randomUUID(), projectId, kind, category: "", label: uncatLabel.trim(), amountPlanned: parseFloat(uncatAmount) || 0 });
    setUncatLabel(""); setUncatAmount(""); setUncatAddOpen(false);
  };

  return (
    <div className="flex flex-col rounded-lg border border-[rgba(245,245,245,0.08)] bg-[rgba(22,22,24,0.9)] overflow-hidden">
      <ColHeader title={isCharge ? "Charges" : "Revenus attendus"} isCharge={isCharge} />

      {/* Named categories */}
      {sortedCats.map(cat => (
        <BudgetCategoryPanel
          key={cat}
          catName={cat}
          lines={groups.get(cat) ?? []}
          isCharge={isCharge}
          projectId={projectId}
          kind={kind}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onAddLine={onAddLine}
          onRename={handleRename}
          onDeleteCat={handleDeleteCat}
        />
      ))}

      {/* Pending new categories */}
      {pendingCats.map((_, i) => (
        <PendingCategory
          key={i}
          isCharge={isCharge}
          kind={kind}
          projectId={projectId}
          onAddLine={(line) => {
            onAddLine(line);
            setPendingCats(p => p.filter((_, j) => j !== i));
          }}
          onCancel={() => setPendingCats(p => p.filter((_, j) => j !== i))}
        />
      ))}

      {/* Sans catégorie — always visible */}
      <UncategorizedPanel
        items={uncatLines}
        isCharge={isCharge}
        addLabel="Ajouter une ligne"
        renderAmount={item => (
          <span className="text-[12px] tabular-nums text-[#F5F5F5]/50 shrink-0">{fmt(item.amountPlanned)}</span>
        )}
        onDelete={onDelete}
        renderEditRow={(item, onDone) => (
          <div className="flex items-center gap-1.5 pl-7 pr-2 py-1.5 bg-[rgba(245,245,245,0.04)]">
            <input defaultValue={item.label} onBlur={e => onUpdate({ ...item, label: e.target.value })}
              className={cn(INPUT, "flex-1 min-w-0")} style={{ width: 0 }} autoFocus
              onKeyDown={e => e.key === "Enter" && onDone()} />
            <input defaultValue={String(item.amountPlanned)}
              onBlur={e => onUpdate({ ...item, amountPlanned: parseFloat(e.target.value) || 0 })}
              type="number" className={cn(INPUT, "shrink-0 tabular-nums text-right")} style={{ width: 64 }}
              onKeyDown={e => e.key === "Enter" && onDone()} />
            <button onClick={onDone} className="text-green-400 p-0.5 shrink-0"><Check size={13} /></button>
          </div>
        )}
        onAdd={() => setUncatAddOpen(true)}
      />

      {/* Inline add for uncategorized */}
      {uncatAddOpen && (
        <div className="flex items-center gap-1.5 pl-7 pr-2 py-1.5 bg-[rgba(240,255,0,0.02)] border-t border-[rgba(245,245,245,0.05)]">
          <input value={uncatLabel} onChange={e => setUncatLabel(e.target.value)} placeholder="Libellé"
            className={cn(INPUT, "flex-1 min-w-0")} style={{ width: 0 }} autoFocus
            onKeyDown={e => e.key === "Enter" && commitUncat()} />
          <input value={uncatAmount} onChange={e => setUncatAmount(e.target.value)} type="number" min="0" step="0.01"
            placeholder="0 €" className={cn(INPUT, "shrink-0 tabular-nums text-right")} style={{ width: 64 }}
            onKeyDown={e => e.key === "Enter" && commitUncat()} />
          <button onClick={commitUncat} className="text-green-400 hover:text-green-300 p-0.5 shrink-0"><Check size={13} /></button>
          <button onClick={() => setUncatAddOpen(false)} className="text-[#F5F5F5]/30 hover:text-[#F5F5F5] p-0.5 shrink-0"><X size={13} /></button>
        </div>
      )}

      {/* Add category */}
      <button
        onClick={() => setPendingCats(p => [...p, ""])}
        className="flex items-center gap-1.5 px-3 py-2.5 text-[12px] text-[#F5F5F5]/25 hover:text-[#F0FF00] transition-colors border-t border-[rgba(245,245,245,0.06)]"
      >
        <Plus size={12} /> Nouvelle catégorie
      </button>

      {lines.length > 0 && (
        <TotalRow label={isCharge ? "Total charges" : "Total attendus"} amount={total} isCharge={isCharge} />
      )}
    </div>
  );
}

// ─── Expense column (real) ─────────────────────────────────────────────────────

function ExpenseCategoryPanel({
  catName, expenses, projectId, isCharge = true,
  onUpdate, onDelete, onAdd, onRename, onDeleteCat,
}: {
  catName: string; expenses: ProjectExpense[]; projectId: string;
  isCharge?: boolean;
  onUpdate: (e: ProjectExpense) => void; onDelete: (id: string) => void;
  onAdd: (e: ProjectExpense) => void;
  onRename: (old: string, next: string) => void;
  onDeleteCat: (name: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(catName);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addLabel, setAddLabel] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addDate, setAddDate] = useState(new Date().toISOString().slice(0, 10));

  const subtotal = expenses.reduce((s, e) => s + e.amount, 0);
  const kind: "expense" | "income" = isCharge ? "expense" : "income";

  const confirmRename = () => {
    const next = renameVal.trim();
    if (!next || next === catName) { setRenaming(false); return; }
    onRename(catName, next);
    setRenaming(false);
  };

  const commitAdd = () => {
    if (!addLabel.trim() || !addAmount) return;
    onAdd({ id: crypto.randomUUID(), projectId, kind, label: addLabel.trim(), category: catName, amount: parseFloat(addAmount) || 0, date: addDate, notes: "" });
    setAddLabel(""); setAddAmount(""); setAddDate(new Date().toISOString().slice(0, 10)); setAddOpen(false);
  };

  return (
    <div className="border-b border-[rgba(245,245,245,0.05)] last:border-0">
      {renaming ? (
        <div className={cn("flex items-center gap-1.5 px-2 py-1.5",
          isCharge ? "bg-[rgba(220,38,38,0.06)]" : "bg-[rgba(74,222,128,0.04)]")}>
          <input value={renameVal} onChange={e => setRenameVal(e.target.value)}
            className={cn(INPUT, "flex-1 min-w-0 font-medium")} autoFocus
            onKeyDown={e => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") setRenaming(false); }} />
          <button onClick={confirmRename} className="text-green-400 hover:text-green-300 p-0.5 shrink-0"><Check size={12} /></button>
          <button onClick={() => setRenaming(false)} className="text-[#F5F5F5]/30 hover:text-[#F5F5F5] p-0.5 shrink-0"><X size={12} /></button>
        </div>
      ) : (
        <CategoryHeader
          name={catName} subtotal={subtotal} isCharge={isCharge} collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
          onStartRename={() => { setRenameVal(catName); setRenaming(true); }}
          onDelete={() => onDeleteCat(catName)}
        />
      )}

      {!collapsed && (
        <>
          {expenses.length === 0 && <p className="pl-7 pr-2 py-2 text-[11px] text-[#F5F5F5]/20 italic">Vide</p>}
          {expenses.map(exp =>
            (exp.id.startsWith("studio-session:") || exp.id.startsWith("live-date:")) ? (
              <LineRead
                key={exp.id}
                label={exp.label}
                right={<>
                  <span className="rounded bg-[#F0FF00]/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-[#F0FF00]/60">Auto</span>
                  <span className="text-[11px] text-[#F5F5F5]/25 shrink-0">{isoToShort(exp.date)}</span>
                  <span className="text-[12px] tabular-nums text-red-400/70 shrink-0">{fmt(exp.amount)}</span>
                </>}
              />
            ) : editingId === exp.id ? (
              <div key={exp.id} className="flex items-center gap-1.5 pl-7 pr-2 py-1.5 bg-[rgba(245,245,245,0.04)]">
                <input defaultValue={exp.label} onBlur={e => onUpdate({ ...exp, label: e.target.value })}
                  className={cn(INPUT, "flex-1 min-w-0")} style={{ width: 0 }} autoFocus
                  onKeyDown={e => e.key === "Enter" && setEditingId(null)} />
                <DatePicker value={exp.date} onChange={d => onUpdate({ ...exp, date: d })}
                  formatDisplay={isoToShort} size="xs" className="w-[100px] shrink-0" calendarIconClassName="h-3 w-3 mr-1 shrink-0" />
                <input defaultValue={String(exp.amount)}
                  onBlur={e => onUpdate({ ...exp, amount: parseFloat(e.target.value) || 0 })}
                  type="number" className={cn(INPUT, "shrink-0 tabular-nums text-right")} style={{ width: 64 }}
                  onKeyDown={e => e.key === "Enter" && setEditingId(null)} />
                <button onClick={() => setEditingId(null)} className="text-green-400 p-0.5 shrink-0"><Check size={13} /></button>
              </div>
            ) : (
              <LineRead
                key={exp.id} label={exp.label}
                right={<>
                  <span className="text-[11px] text-[#F5F5F5]/25 shrink-0">{isoToShort(exp.date)}</span>
                  <span className="text-[12px] tabular-nums text-red-400/70 shrink-0">{fmt(exp.amount)}</span>
                </>}
                onEdit={() => setEditingId(exp.id)}
                onDelete={() => onDelete(exp.id)}
              />
            )
          )}
          {addOpen ? (
            <div className="flex items-center gap-1.5 pl-7 pr-2 py-1.5 bg-[rgba(240,255,0,0.02)] border-t border-[rgba(245,245,245,0.05)]">
              <input value={addLabel} onChange={e => setAddLabel(e.target.value)} placeholder="Libellé"
                className={cn(INPUT, "flex-1 min-w-0")} style={{ width: 0 }} autoFocus
                onKeyDown={e => e.key === "Enter" && commitAdd()} />
              <DatePicker value={addDate} onChange={setAddDate} formatDisplay={isoToShort} size="xs"
                className="w-[100px] shrink-0" calendarIconClassName="h-3 w-3 mr-1 shrink-0" />
              <input value={addAmount} onChange={e => setAddAmount(e.target.value)} type="number" min="0" step="0.01"
                placeholder="0 €" className={cn(INPUT, "shrink-0 tabular-nums text-right")} style={{ width: 64 }}
                onKeyDown={e => e.key === "Enter" && commitAdd()} />
              <button onClick={commitAdd} className="text-green-400 hover:text-green-300 p-0.5 shrink-0"><Check size={13} /></button>
              <button onClick={() => setAddOpen(false)} className="text-[#F5F5F5]/30 hover:text-[#F5F5F5] p-0.5 shrink-0"><X size={13} /></button>
            </div>
          ) : (
            <AddLineBtn label="Ajouter une dépense" onClick={() => setAddOpen(true)} />
          )}
        </>
      )}
    </div>
  );
}

// ─── Pending expense category ──────────────────────────────────────────────────

function PendingExpenseCategory({
  projectId, kind = "expense", onAdd, onCancel,
}: {
  projectId: string;
  kind?: "expense" | "income";
  onAdd: (e: ProjectExpense) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<"name" | "line">("name");
  const [catName, setCatName] = useState("");
  const [addLabel, setAddLabel] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addDate, setAddDate] = useState(new Date().toISOString().slice(0, 10));

  const commitLine = () => {
    if (!addLabel.trim() || !addAmount) return;
    onAdd({ id: crypto.randomUUID(), projectId, kind, label: addLabel.trim(), category: catName.trim(), amount: parseFloat(addAmount) || 0, date: addDate, notes: "" });
  };

  const isCharge = kind === "expense";
  return (
    <div className="border-b border-[rgba(245,245,245,0.05)]">
      <div className={cn("flex items-center gap-1.5 px-2 py-1.5",
        isCharge ? "bg-[rgba(220,38,38,0.06)]" : "bg-[rgba(74,222,128,0.04)]")}>
        <ChevronDown size={13} className="text-[#F5F5F5]/30 shrink-0" />
        {step === "name" ? (
          <>
            <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Nom de la catégorie"
              className={cn(INPUT, "flex-1 min-w-0 font-semibold", isCharge ? "text-red-400/70" : "text-green-400/70")} autoFocus
              onKeyDown={e => { if (e.key === "Enter" && catName.trim()) setStep("line"); if (e.key === "Escape") onCancel(); }} />
            <button onClick={() => catName.trim() && setStep("line")} className="text-green-400 p-0.5 shrink-0"><Check size={12} /></button>
            <button onClick={onCancel} className="text-[#F5F5F5]/30 hover:text-[#F5F5F5] p-0.5 shrink-0"><X size={12} /></button>
          </>
        ) : (
          <span className={cn("flex-1 text-[11px] font-semibold uppercase tracking-wider", isCharge ? "text-red-400/70" : "text-green-400/70")}>{catName}</span>
        )}
      </div>
      {step === "line" && (
        <div className="flex items-center gap-1.5 pl-7 pr-2 py-1.5 bg-[rgba(240,255,0,0.02)] border-t border-[rgba(245,245,245,0.05)]">
          <input value={addLabel} onChange={e => setAddLabel(e.target.value)} placeholder="Libellé"
            className={cn(INPUT, "flex-1 min-w-0")} style={{ width: 0 }} autoFocus
            onKeyDown={e => e.key === "Enter" && commitLine()} />
          <DatePicker value={addDate} onChange={setAddDate} formatDisplay={isoToShort} size="xs"
            className="w-[100px] shrink-0" calendarIconClassName="h-3 w-3 mr-1 shrink-0" />
          <input value={addAmount} onChange={e => setAddAmount(e.target.value)} type="number" min="0" step="0.01"
            placeholder="0 €" className={cn(INPUT, "shrink-0 tabular-nums text-right")} style={{ width: 64 }}
            onKeyDown={e => e.key === "Enter" && commitLine()} />
          <button onClick={commitLine} className="text-green-400 p-0.5 shrink-0"><Check size={13} /></button>
          <button onClick={onCancel} className="text-[#F5F5F5]/30 hover:text-[#F5F5F5] p-0.5 shrink-0"><X size={13} /></button>
        </div>
      )}
    </div>
  );
}

// ─── Expense column ────────────────────────────────────────────────────────────

function ExpenseColumn({ expenses, projectId, total, onUpdate, onDelete, onAdd }: {
  expenses: ProjectExpense[]; projectId: string; total: number;
  onUpdate: (e: ProjectExpense) => void; onDelete: (id: string) => void; onAdd: (e: ProjectExpense) => void;
}) {
  const [pendingCats, setPendingCats] = useState<number[]>([]);
  const [uncatAddOpen, setUncatAddOpen] = useState(false);
  const [uncatLabel, setUncatLabel] = useState("");
  const [uncatAmount, setUncatAmount] = useState("");
  const [uncatDate, setUncatDate] = useState(new Date().toISOString().slice(0, 10));

  const namedExp = expenses.filter(e => e.category?.trim());
  const uncatExp = expenses.filter(e => !e.category?.trim());

  const groups = new Map<string, ProjectExpense[]>();
  for (const e of namedExp) {
    const k = e.category.trim();
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  const sortedCats = [...groups.keys()].sort((a, b) => a.localeCompare(b));

  const handleRename = (oldName: string, newName: string) =>
    expenses.filter(e => e.category?.trim() === oldName).forEach(e => onUpdate({ ...e, category: newName }));

  const handleDeleteCat = (catName: string) =>
    expenses.filter(e => e.category?.trim() === catName).forEach(e => onDelete(e.id));

  const commitUncat = () => {
    if (!uncatLabel.trim() || !uncatAmount) return;
    onAdd({ id: crypto.randomUUID(), projectId, kind: "expense", label: uncatLabel.trim(), category: "", amount: parseFloat(uncatAmount) || 0, date: uncatDate, notes: "" });
    setUncatLabel(""); setUncatAmount(""); setUncatDate(new Date().toISOString().slice(0, 10)); setUncatAddOpen(false);
  };

  return (
    <div className="flex flex-col rounded-lg border border-[rgba(245,245,245,0.08)] bg-[rgba(22,22,24,0.9)] overflow-hidden">
      <ColHeader title="Charges réelles" isCharge={true} />

      {sortedCats.map(cat => (
        <ExpenseCategoryPanel key={cat} catName={cat} expenses={groups.get(cat) ?? []} projectId={projectId}
          onUpdate={onUpdate} onDelete={onDelete} onAdd={onAdd}
          onRename={handleRename} onDeleteCat={handleDeleteCat} />
      ))}

      {pendingCats.map((_, i) => (
        <PendingExpenseCategory key={i} projectId={projectId}
          onAdd={e => { onAdd(e); setPendingCats(p => p.filter((__, j) => j !== i)); }}
          onCancel={() => setPendingCats(p => p.filter((__, j) => j !== i))} />
      ))}

      {/* Sans catégorie — always visible */}
      <UncategorizedPanel
        items={uncatExp}
        isCharge={true}
        addLabel="Ajouter une dépense"
        renderAmount={item => (
          <><span className="text-[11px] text-[#F5F5F5]/25 shrink-0">{isoToShort(item.date)}</span>
          <span className="text-[12px] tabular-nums text-red-400/70 shrink-0">{fmt(item.amount)}</span></>
        )}
        onDelete={onDelete}
        renderEditRow={(item, onDone) => (
          <div className="flex items-center gap-1.5 pl-7 pr-2 py-1.5 bg-[rgba(245,245,245,0.04)]">
            <input defaultValue={item.label} onBlur={e => onUpdate({ ...item, label: e.target.value })}
              className={cn(INPUT, "flex-1 min-w-0")} style={{ width: 0 }} autoFocus
              onKeyDown={e => e.key === "Enter" && onDone()} />
            <DatePicker value={item.date} onChange={d => onUpdate({ ...item, date: d })}
              formatDisplay={isoToShort} size="xs" className="w-[100px] shrink-0" calendarIconClassName="h-3 w-3 mr-1 shrink-0" />
            <input defaultValue={String(item.amount)}
              onBlur={e => onUpdate({ ...item, amount: parseFloat(e.target.value) || 0 })}
              type="number" className={cn(INPUT, "shrink-0 tabular-nums text-right")} style={{ width: 64 }}
              onKeyDown={e => e.key === "Enter" && onDone()} />
            <button onClick={onDone} className="text-green-400 p-0.5 shrink-0"><Check size={13} /></button>
          </div>
        )}
        onAdd={() => setUncatAddOpen(true)}
      />

      {uncatAddOpen && (
        <div className="flex items-center gap-1.5 pl-7 pr-2 py-1.5 bg-[rgba(240,255,0,0.02)] border-t border-[rgba(245,245,245,0.05)]">
          <input value={uncatLabel} onChange={e => setUncatLabel(e.target.value)} placeholder="Libellé"
            className={cn(INPUT, "flex-1 min-w-0")} style={{ width: 0 }} autoFocus
            onKeyDown={e => e.key === "Enter" && commitUncat()} />
          <DatePicker value={uncatDate} onChange={setUncatDate} formatDisplay={isoToShort} size="xs"
            className="w-[100px] shrink-0" calendarIconClassName="h-3 w-3 mr-1 shrink-0" />
          <input value={uncatAmount} onChange={e => setUncatAmount(e.target.value)} type="number" min="0" step="0.01"
            placeholder="0 €" className={cn(INPUT, "shrink-0 tabular-nums text-right")} style={{ width: 64 }}
            onKeyDown={e => e.key === "Enter" && commitUncat()} />
          <button onClick={commitUncat} className="text-green-400 p-0.5 shrink-0"><Check size={13} /></button>
          <button onClick={() => setUncatAddOpen(false)} className="text-[#F5F5F5]/30 hover:text-[#F5F5F5] p-0.5 shrink-0"><X size={13} /></button>
        </div>
      )}

      <button onClick={() => setPendingCats(p => [...p, p.length])}
        className="flex items-center gap-1.5 px-3 py-2.5 text-[12px] text-[#F5F5F5]/25 hover:text-[#F0FF00] transition-colors border-t border-[rgba(245,245,245,0.06)]">
        <Plus size={12} /> Nouvelle catégorie
      </button>

      {expenses.length > 0 && <TotalRow label="Total dépenses" amount={total} isCharge={true} />}
    </div>
  );
}

// ─── Revenues column ───────────────────────────────────────────────────────────

function RevenuesColumn({
  manualRevenues, linkedRevenues, total, projectId,
  onUpdate, onDelete, onAdd,
}: {
  manualRevenues: ProjectExpense[];
  linkedRevenues: ReturnType<typeof useProjectBudgetData>["revenues"];
  total: number;
  projectId: string;
  onUpdate: (e: ProjectExpense) => void;
  onDelete: (id: string) => void;
  onAdd: (e: ProjectExpense) => void;
}) {
  const [pendingCats, setPendingCats] = useState<number[]>([]);
  const [uncatAddOpen, setUncatAddOpen] = useState(false);
  const [uncatLabel, setUncatLabel] = useState("");
  const [uncatAmount, setUncatAmount] = useState("");
  const [uncatDate, setUncatDate] = useState(new Date().toISOString().slice(0, 10));

  const namedRev = manualRevenues.filter(e => e.category?.trim());
  const uncatRev = manualRevenues.filter(e => !e.category?.trim());

  const groups = new Map<string, ProjectExpense[]>();
  for (const e of namedRev) {
    const k = e.category.trim();
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  const sortedCats = [...groups.keys()].sort((a, b) => a.localeCompare(b));

  const handleRename = (oldName: string, newName: string) =>
    manualRevenues.filter(e => e.category?.trim() === oldName).forEach(e => onUpdate({ ...e, category: newName }));

  const handleDeleteCat = (catName: string) =>
    manualRevenues.filter(e => e.category?.trim() === catName).forEach(e => onDelete(e.id));

  const commitUncat = () => {
    if (!uncatLabel.trim() || !uncatAmount) return;
    onAdd({ id: crypto.randomUUID(), projectId, kind: "income", label: uncatLabel.trim(), category: "", amount: parseFloat(uncatAmount) || 0, date: uncatDate, notes: "" });
    setUncatLabel(""); setUncatAmount(""); setUncatDate(new Date().toISOString().slice(0, 10)); setUncatAddOpen(false);
  };

  // Reuse ExpenseCategoryPanel but wired for income kind
  const hasAny = manualRevenues.length > 0 || linkedRevenues.length > 0;

  return (
    <div className="flex flex-col rounded-lg border border-[rgba(245,245,245,0.08)] bg-[rgba(22,22,24,0.9)] overflow-hidden">
      <ColHeader title="Revenus encaissés" isCharge={false} />

      {/* Manual revenue categories */}
      {sortedCats.map(cat => (
        <ExpenseCategoryPanel key={cat} catName={cat} expenses={groups.get(cat) ?? []} projectId={projectId}
          isCharge={false}
          onUpdate={onUpdate} onDelete={onDelete} onAdd={onAdd}
          onRename={handleRename} onDeleteCat={handleDeleteCat} />
      ))}

      {pendingCats.map((_, i) => (
        <PendingExpenseCategory key={i} projectId={projectId} kind="income"
          onAdd={e => { onAdd(e); setPendingCats(p => p.filter((__, j) => j !== i)); }}
          onCancel={() => setPendingCats(p => p.filter((__, j) => j !== i))} />
      ))}

      {/* Sans catégorie — manual revenues */}
      <UncategorizedPanel
        items={uncatRev}
        isCharge={false}
        addLabel="Ajouter un revenu"
        renderAmount={item => (
          <><span className="text-[11px] text-[#F5F5F5]/25 shrink-0">{isoToShort(item.date)}</span>
          <span className="text-[12px] tabular-nums text-green-400/70 shrink-0">{fmt(item.amount)}</span></>
        )}
        onDelete={onDelete}
        renderEditRow={(item, onDone) => (
          <div className="flex items-center gap-1.5 pl-7 pr-2 py-1.5 bg-[rgba(245,245,245,0.04)]">
            <input defaultValue={item.label} onBlur={e => onUpdate({ ...item, label: e.target.value })}
              className={cn(INPUT, "flex-1 min-w-0")} style={{ width: 0 }} autoFocus
              onKeyDown={e => e.key === "Enter" && onDone()} />
            <DatePicker value={item.date} onChange={d => onUpdate({ ...item, date: d })}
              formatDisplay={isoToShort} size="xs" className="w-[100px] shrink-0" calendarIconClassName="h-3 w-3 mr-1 shrink-0" />
            <input defaultValue={String(item.amount)}
              onBlur={e => onUpdate({ ...item, amount: parseFloat(e.target.value) || 0 })}
              type="number" className={cn(INPUT, "shrink-0 tabular-nums text-right")} style={{ width: 64 }}
              onKeyDown={e => e.key === "Enter" && onDone()} />
            <button onClick={onDone} className="text-green-400 p-0.5 shrink-0"><Check size={13} /></button>
          </div>
        )}
        onAdd={() => setUncatAddOpen(true)}
      />

      {uncatAddOpen && (
        <div className="flex items-center gap-1.5 pl-7 pr-2 py-1.5 bg-[rgba(240,255,0,0.02)] border-t border-[rgba(245,245,245,0.05)]">
          <input value={uncatLabel} onChange={e => setUncatLabel(e.target.value)} placeholder="Libellé"
            className={cn(INPUT, "flex-1 min-w-0")} style={{ width: 0 }} autoFocus
            onKeyDown={e => e.key === "Enter" && commitUncat()} />
          <DatePicker value={uncatDate} onChange={setUncatDate} formatDisplay={isoToShort} size="xs"
            className="w-[100px] shrink-0" calendarIconClassName="h-3 w-3 mr-1 shrink-0" />
          <input value={uncatAmount} onChange={e => setUncatAmount(e.target.value)} type="number" min="0" step="0.01"
            placeholder="0 €" className={cn(INPUT, "shrink-0 tabular-nums text-right")} style={{ width: 64 }}
            onKeyDown={e => e.key === "Enter" && commitUncat()} />
          <button onClick={commitUncat} className="text-green-400 p-0.5 shrink-0"><Check size={13} /></button>
          <button onClick={() => setUncatAddOpen(false)} className="text-[#F5F5F5]/30 hover:text-[#F5F5F5] p-0.5 shrink-0"><X size={13} /></button>
        </div>
      )}

      <button onClick={() => setPendingCats(p => [...p, p.length])}
        className="flex items-center gap-1.5 px-3 py-2.5 text-[12px] text-[#F5F5F5]/25 hover:text-[#F0FF00] transition-colors border-t border-[rgba(245,245,245,0.06)]">
        <Plus size={12} /> Nouvelle catégorie
      </button>

      {/* Linked revenues (invoices / royalties) — read-only section */}
      {linkedRevenues.length > 0 && (
        <>
          <div className="px-3 py-1.5 border-t border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.02)]">
            <span className="text-[10px] uppercase tracking-wider text-[#F5F5F5]/25 font-medium">Factures & royalties</span>
          </div>
          {linkedRevenues.map(rev => (
            <div key={rev.id} className="flex items-center gap-2 px-3 py-1.5 border-b border-[rgba(245,245,245,0.04)] last:border-0">
              <span className={cn("shrink-0 text-[9px] px-1 py-0.5 rounded border font-medium",
                rev.source === "invoice" ? "border-blue-500/30 text-blue-400" : "border-purple-500/30 text-purple-400")}>
                {rev.source === "invoice" ? "Facture" : rev.source === "live" ? "Cachet" : "Royalty"}
              </span>
              <span className="flex-1 text-[13px] text-[#F5F5F5]/60 truncate min-w-0">{rev.label}</span>
              <span className="text-[11px] text-[#F5F5F5]/25 shrink-0">{isoToShort(rev.date)}</span>
              <span className="text-[12px] tabular-nums text-green-400/60 shrink-0">{fmt(rev.amount)}</span>
            </div>
          ))}
        </>
      )}

      {hasAny && <TotalRow label="Total revenus" amount={total} isCharge={false} />}
      <a href="/incomes/facturation"
        className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-[#F5F5F5]/20 hover:text-[#F0FF00] border-t border-[rgba(245,245,245,0.05)] transition-colors">
        <ExternalLink size={11} /> Gérer dans Revenus
      </a>
    </div>
  );
}

// ─── BudgetTab ─────────────────────────────────────────────────────────────────

type SubTab = "previsionnel" | "reel";

export function BudgetTab({ project }: { project: Project }) {
  const [subTab, setSubTab] = useState<SubTab>("previsionnel");
  const { lines, expenses, manualRevenues, revenues, setLines, setExpenses, loading, error, kpis } =
    useProjectBudgetData(project.id);

  if (loading) return <p className="text-[13px] text-[#F5F5F5]/20 py-8">Chargement...</p>;
  if (error) return <p className="text-[13px] text-red-400/70 py-4">{error}</p>;

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-[rgba(245,245,245,0.04)] rounded-lg p-1 w-fit">
        {(["previsionnel", "reel"] as SubTab[]).map(tab => (
          <button key={tab} onClick={() => setSubTab(tab)}
            className={cn("px-4 py-1.5 rounded-md text-[13px] font-medium transition-all",
              subTab === tab ? "bg-[rgba(245,245,245,0.1)] text-[#F5F5F5] shadow-sm" : "text-[#F5F5F5]/40 hover:text-[#F5F5F5]/70")}>
            {tab === "previsionnel" ? "Prévisionnel" : "Réel"}
          </button>
        ))}
      </div>

      {subTab === "previsionnel" && (
        <>
          <KpiStrip chargesLabel="Charges prévues" chargesValue={kpis.totalPlannedExpenses}
            revenusLabel="Revenus attendus" revenusValue={kpis.totalPlannedIncome}
            balance={kpis.totalPlannedIncome - kpis.totalPlannedExpenses} />
          <div className="grid grid-cols-2 gap-4">
            <BudgetColumn lines={lines.filter(l => l.kind === "expense")} isCharge kind="expense"
              projectId={project.id} total={kpis.totalPlannedExpenses}
              onUpdate={u => setLines(prev => prev.map(l => l.id === u.id ? u : l))}
              onDelete={id => setLines(prev => prev.filter(l => l.id !== id))}
              onAddLine={line => setLines(prev => [...prev, line])} />
            <BudgetColumn lines={lines.filter(l => l.kind === "income")} isCharge={false} kind="income"
              projectId={project.id} total={kpis.totalPlannedIncome}
              onUpdate={u => setLines(prev => prev.map(l => l.id === u.id ? u : l))}
              onDelete={id => setLines(prev => prev.filter(l => l.id !== id))}
              onAddLine={line => setLines(prev => [...prev, line])} />
          </div>
        </>
      )}

      {subTab === "reel" && (
        <>
          <KpiStrip chargesLabel="Dépenses réelles" chargesValue={kpis.totalRealExpenses}
            revenusLabel="Revenus encaissés" revenusValue={kpis.totalRealIncome}
            balance={kpis.balance} />
          <div className="grid grid-cols-2 gap-4">
            <ExpenseColumn expenses={expenses} projectId={project.id} total={kpis.totalRealExpenses}
              onUpdate={u => setExpenses(prev => prev.map(e => e.id === u.id ? u : e))}
              onDelete={id => setExpenses(prev => prev.filter(e => e.id !== id))}
              onAdd={exp => setExpenses(prev => [exp, ...prev])} />
            <RevenuesColumn
              manualRevenues={manualRevenues}
              linkedRevenues={revenues}
              total={kpis.totalRealIncome}
              projectId={project.id}
              onUpdate={u => setExpenses(prev => prev.map(e => e.id === u.id ? u : e))}
              onDelete={id => setExpenses(prev => prev.filter(e => e.id !== id))}
              onAdd={exp => setExpenses(prev => [...prev, exp])}
            />
          </div>
        </>
      )}
    </div>
  );
}
