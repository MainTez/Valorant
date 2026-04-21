import { Target } from "lucide-react";
import Link from "next/link";
import type { TeamNoteRow } from "@/types/domain";

interface Props {
  note: TeamNoteRow | null;
}

export function FocusCard({ note }: Props) {
  return (
    <div className="surface relative overflow-hidden p-5 h-full flex flex-col">
      <div className="eyebrow">Weekly Focus</div>
      <div className="flex-1 mt-5 flex flex-col items-center justify-center text-center gap-3">
        <div className="rounded-full p-3 bg-[color:var(--accent-dim)] border border-[color:var(--accent-soft)] text-[color:var(--accent)]">
          <Target className="h-6 w-6" />
        </div>
        <div className="font-display text-2xl tracking-wider">
          {note?.title ?? "Set Focus"}
        </div>
        <p className="text-sm text-[color:var(--color-muted)] max-w-[22ch]">
          {note?.body ?? "No focus yet. Have the coach pin one."}
        </p>
      </div>
      <Link
        href="/matches"
        className="mt-4 btn-ghost justify-center text-[color:var(--accent)]"
      >
        View Focus
      </Link>
    </div>
  );
}
