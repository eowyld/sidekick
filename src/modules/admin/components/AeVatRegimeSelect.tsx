"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  AE_VAT_REGIME_OPTIONS,
  aeVatRegimeFromSelectValue,
  aeVatRegimeToSelectValue,
  aeVatRegimeTriggerLabel,
} from "@/modules/admin/data/statuts-form-config";

type Props = {
  id: string;
  value: string;
  onChange: (stored: string) => void;
};

export function AeVatRegimeSelect({ id, value, onChange }: Props) {
  const selectValue = aeVatRegimeToSelectValue(value);
  const isLegacy = selectValue.startsWith("legacy:");
  const legacyDisplay = isLegacy ? aeVatRegimeFromSelectValue(selectValue) : null;
  const fieldLabel = aeVatRegimeTriggerLabel(selectValue);

  return (
    <Select
      value={selectValue}
      onValueChange={(v) => onChange(aeVatRegimeFromSelectValue(v))}
    >
      <SelectTrigger
        id={id}
        className="w-full"
        aria-label={fieldLabel || "Choisir un régime TVA"}
      >
        <span className="line-clamp-1 min-w-0 flex-1 truncate text-left">
          {fieldLabel ? (
            fieldLabel
          ) : (
            <span className="font-normal text-[#F5F5F5]/45">
              Choisir un régime TVA
            </span>
          )}
        </span>
      </SelectTrigger>
      <SelectContent>
        {legacyDisplay ? (
          <SelectItem value={selectValue}>
            {`${legacyDisplay} (ancienne saisie libre)`}
          </SelectItem>
        ) : null}
        {AE_VAT_REGIME_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.listLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
