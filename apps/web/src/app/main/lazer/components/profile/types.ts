export interface LazerChronicle {
  id: string;
  side: "left" | "right";
  title: string;
  quote: string;
  img: string;
}

export interface LazerStat {
  label: string;
  value: string;
}

export interface LazerUserProfile {
  userId: string;
  displayName: string;
  username: string;
  status: string;
  bio: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  listening: string;
  stats: LazerStat[];
  primaryAction: string;
  quickActions: string[];
  communities: string[];
  sectionLabel: string;
  relics: string[];
  nameFont: string;
  nameEffect: string;
  nameColor: string;
  themeColor: string;
  themeMode: "light" | "dark";
  bannerColor?: string;
  spotifyEnabled?: boolean;
  lastPlayedTrack?: any;
  chronicles: LazerChronicle[];
}

export const DEMO_USER: LazerUserProfile = {
  userId: "",
  displayName: "Hikari",
  username: "hikari_chan",
  status: "Exploring the skies",
  bio: "Magic academy student by day, dream walker by night. ✨ Collecting fragments of stars.",
  avatarUrl: null, // we can rely on initials if no URL
  bannerUrl: null,
  listening: "Starry Sky OST",
  stats: [
    { label: "Allies",  value: "12.4k" },
    { label: "Rank",    value: "Lv. 42" },
    { label: "Relics",  value: "89"    },
  ],
  primaryAction: "Party Up",
  quickActions: ["Gift", "Wink", "Cheer", "Duel"],
  communities: ["Star Walkers Guild", "Magic Academy"],
  sectionLabel: "Equipped Relics",
  relics: ["👑", "🌙", "❤️"],
  nameFont: "inherit",
  nameEffect: "solido",
  nameColor: "#e879f9",
  themeColor: "#e879f9",
  themeMode: "dark",
  chronicles: [],
};
