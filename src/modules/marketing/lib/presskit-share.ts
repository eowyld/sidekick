import type { PresskitProfile } from "@/modules/marketing/data/presskit";

export function encodePresskitForShare(profile: PresskitProfile): string {
  const json = JSON.stringify(profile);
  const base64 = typeof btoa !== "undefined" ? btoa(encodeURIComponent(json)) : "";
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodePresskitFromShare(encoded: string): PresskitProfile | null {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(atob(base64));
    return JSON.parse(json) as PresskitProfile;
  } catch {
    return null;
  }
}

export function getPresskitShareUrl(encoded: string): string {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin;
  return `${origin}/presskit/view?d=${encoded}`;
}
