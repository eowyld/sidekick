/**
 * Tarif mensuel affiché sur la landing, en euros.
 *
 * Il apparaît à deux endroits qui doivent rester d'accord : le calcul
 * d'économies du comparatif (`CostComparison`) et la mention d'après-alpha sous
 * la carte tarifaire (`Pricing`). Un chiffre écrit en dur des deux côtés finit
 * toujours par diverger — d'où cette constante partagée.
 *
 * Pendant l'alpha l'accès est gratuit ; ce prix est celui annoncé pour la suite,
 * sans date de bascule.
 */
export const SIDEKICK_PRICE = 8;
