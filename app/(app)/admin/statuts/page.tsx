import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Ancienne URL : la liste des statuts vit désormais sur `/admin`. */
export default async function AdminStatutsRedirectPage({ searchParams }: Props) {
  const sp = await searchParams;
  const usp = new URLSearchParams();
  for (const [key, val] of Object.entries(sp)) {
    if (val === undefined) continue;
    if (Array.isArray(val)) {
      for (const v of val) usp.append(key, v);
    } else {
      usp.append(key, val);
    }
  }
  const qs = usp.toString();
  redirect(qs ? `/admin?${qs}` : "/admin");
}
