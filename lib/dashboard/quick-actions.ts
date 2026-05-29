import type { TeamSlug } from "@/lib/constants";

export type DashboardQuickActionIcon = "file-text" | "list-plus" | "plus" | "trophy" | "film";

export interface DashboardQuickAction {
  label: string;
  href: string;
  icon: DashboardQuickActionIcon;
  teamOnly?: TeamSlug;
}

const ACTIONS: DashboardQuickAction[] = [
  { label: "New Note", href: "/matches", icon: "file-text" },
  { label: "New Task", href: "/tasks", icon: "list-plus" },
  { label: "Log Match", href: "/matches/new", icon: "plus" },
  { label: "Tournaments", href: "/tournaments", icon: "trophy", teamOnly: "surf-n-bulls" },
  { label: "VOD Library", href: "/vods", icon: "film" },
];

export function getDashboardQuickActions(team: TeamSlug): DashboardQuickAction[] {
  return ACTIONS.filter((action) => !action.teamOnly || action.teamOnly === team);
}
