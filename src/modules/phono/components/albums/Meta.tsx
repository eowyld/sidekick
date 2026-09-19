/**
 * Micro-libellé en capitales espacées au-dessus de sa valeur — signature du
 * produit. Partagé par la carte d'album et son panneau déplié, pour que le
 * récap du panneau parle exactement la même langue que la carte qu'on vient
 * d'ouvrir.
 */
export function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/25">
        {label}
      </p>
      <div className="truncate">{children}</div>
    </div>
  );
}
