import Link from "next/link";
import { FileText, Film, ListPlus, Plus, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getDashboardQuickActions, type DashboardQuickActionIcon } from "@/lib/dashboard/quick-actions";
import type { TeamSlug } from "@/lib/constants";

const ICONS: Record<DashboardQuickActionIcon, LucideIcon> = {
  "file-text": FileText,
  "list-plus": ListPlus,
  plus: Plus,
  trophy: Trophy,
  film: Film,
};

export function QuickActions({ team }: { team: TeamSlug }) {
  const actions = getDashboardQuickActions(team);
  return (
    <div className="surface p-5 h-full flex flex-col">
      <div className="eyebrow">Quick Actions</div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {actions.map((a) => {
          const Icon = ICONS[a.icon];
          return (
          <Link
            key={a.label}
            href={a.href}
            className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:border-[color:var(--accent-soft)] hover:text-[color:var(--accent)] transition"
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs uppercase tracking-widest">
              {a.label}
            </span>
          </Link>
          );
        })}
      </div>
    </div>
  );
}
