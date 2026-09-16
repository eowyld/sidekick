import Link from "next/link";
import { SidekickLogo } from "@/components/branding/SidekickLogo";
import { CookieSettingsButton } from "@/components/analytics/CookieSettingsButton";
import { cn, focusRing } from "@/lib/utils";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Produit",
    // Ancres préfixées par « / » : le footer apparaît aussi sur des pages hors
    // landing (confidentialité…), où « #modules » seul ne pointerait sur rien.
    links: [
      { label: "Modules", href: "/#modules" },
      { label: "Tarifs", href: "/#pricing" },
      { label: "Comparatif", href: "/#comparatif" },
      { label: "En développement", href: "/#roadmap" },
      { label: "Créer mon compte", href: "/inscription" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Compte",
    links: [
      { label: "Connexion", href: "/login" },
      { label: "Créer un compte", href: "/inscription" },
    ],
  },
  {
    title: "Légal",
    links: [
      { label: "Mentions légales", href: "/mentions-legales" },
      { label: "CGU", href: "/cgu" },
      { label: "Confidentialité", href: "/confidentialite" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="bg-[#0a0a0a] py-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 md:grid-cols-[1.5fr,repeat(4,1fr)]">
          <div className="space-y-4">
            <SidekickLogo className="h-16 w-auto" />
            <p className="max-w-xs text-sm leading-relaxed text-[#f5f5f5]/50">
              Un manager tout-en-un pour les artistes de musique indépendants.
              Phono, édition, live, marketing, revenus, administratif.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title} className="space-y-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
                {col.title}
              </p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className={cn(
                        "rounded-sm text-sm text-[#f5f5f5]/60 transition-colors hover:text-[#F0FF00]",
                        focusRing
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 space-y-2 border-t border-[rgba(245,245,245,0.12)] pt-8">
          <p className="max-w-xl text-xs leading-relaxed text-[#f5f5f5]/45">
            Tes données t&apos;appartiennent : export de toutes tes données sur
            simple demande, hébergement en Europe.{" "}
            <Link
              href="/confidentialite"
              className={cn(
                "rounded-sm underline decoration-[rgba(245,245,245,0.25)] underline-offset-2 transition-colors hover:text-[#F0FF00] hover:decoration-[#F0FF00]",
                focusRing
              )}
            >
              En savoir plus
            </Link>
          </p>
          <p className="text-xs text-[#f5f5f5]/30">
            © {new Date().getFullYear()} SIDEKICK. Alpha ouverte.{" "}
            <CookieSettingsButton
              className={cn(
                "rounded-sm underline decoration-[rgba(245,245,245,0.2)] underline-offset-2 transition-colors hover:text-[#F0FF00]",
                focusRing
              )}
            />
          </p>
        </div>
      </div>
    </footer>
  );
}
