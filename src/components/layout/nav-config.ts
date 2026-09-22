export type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  mobilePrimary?: boolean;
};

export const primaryNav: NavItem[] = [
  { href: "/", label: "Home", shortLabel: "Home", mobilePrimary: true },
  { href: "/live", label: "Live", shortLabel: "Live", mobilePrimary: true },
  { href: "/squad", label: "Squad", shortLabel: "Squad", mobilePrimary: true },
  { href: "/matches", label: "Matches", shortLabel: "Matches", mobilePrimary: true },
];

export const secondaryNav: NavItem[] = [
  { href: "/scorecards", label: "Scorecards" },
  { href: "/series", label: "Series" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/records", label: "Records" },
  { href: "/stats", label: "Stats" },
  { href: "/players", label: "Player Profiles" },
  { href: "/history", label: "Match History" },
  { href: "/settings", label: "Settings" },
];

export const allNav = [...primaryNav, ...secondaryNav];
