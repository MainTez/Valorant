import Link from "next/link";
import { FileText, ListPlus, Plus, Upload } from "lucide-react";

const ACTIONS = [
  { label: "New Note", href: "/matches", icon: FileText },
  { label: "New Task", href: "/tasks", icon: ListPlus },
  { label: "Log Match", href: "/matches/new", icon: Plus },
  { label: "Upload VOD", href: "/matches/new", icon: Upload },
];

export function QuickActions() {
  return (
    <div className="surface p-5 h-full flex flex-col">
      <div className="eyebrow">Quick Actions</div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {ACTIONS.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:border-[color:var(--accent-soft)] hover:text-[color:var(--accent)] transition"
          >
            <a.icon className="h-5 w-5" />
            <span className="text-xs uppercase tracking-widest">
              {a.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
