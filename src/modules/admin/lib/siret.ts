/** Chiffres uniquement (espaces, tirets, etc. ignorés). */
export function siretDigitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Valide : champ vide, ou exactement 14 chiffres. */
export function isSiretInputValid(value: string): boolean {
  const n = siretDigitsOnly(value).length;
  return n === 0 || n === 14;
}
