export const PRESSKIT_STORAGE_KEY = "marketing:presskit:profile";

export type PresskitSocials = {
  instagram: string;
  facebook: string;
};

export type PresskitContact = {
  email: string;
  whatsapp: string;
};

export type StreamingPlatformKey =
  | "spotify"
  | "deezer"
  | "appleMusic"
  | "tidal"
  | "qobuz"
  | "soundcloud";

export type StreamingLinks = Record<StreamingPlatformKey, string>;

export type PresskitCustomLink = {
  id: string;
  label: string;
  url: string;
};

export type PresskitCover = {
  id: string;
  title: string;
  imageUrl: string;
  link: string;
};

export type PresskitRealisation = {
  id: string;
  title: string;
  description: string;
  link: string;
};

export type PresskitProfile = {
  artistTitle: string;
  hook: string;
  mainPhotoUrl: string;
  bio: string;
  socials: PresskitSocials;
  contact: PresskitContact;
  streamingArtistName: string;
  streamingLinks: StreamingLinks;
  customStreamingLinks: PresskitCustomLink[];
  covers: PresskitCover[];
  latest: PresskitRealisation[];
};

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const DEFAULT_PRESSKIT_PROFILE: PresskitProfile = {
  artistTitle: "",
  hook: "",
  mainPhotoUrl: "",
  bio: "",
  socials: {
    instagram: "",
    facebook: ""
  },
  contact: {
    email: "",
    whatsapp: ""
  },
  streamingArtistName: "",
  streamingLinks: {
    spotify: "",
    deezer: "",
    appleMusic: "",
    tidal: "",
    qobuz: "",
    soundcloud: ""
  },
  customStreamingLinks: [],
  covers: Array.from({ length: 3 }).map((_, index) => ({
    id: makeId(),
    title: "",
    imageUrl: "",
    link: "",
  })),
  latest: [
    { id: makeId(), title: "", description: "", link: "" }
  ]
};

