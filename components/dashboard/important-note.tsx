import { Star } from "lucide-react";
import type { TeamNoteRow } from "@/types/domain";

export function ImportantNote({ note }: { note: TeamNoteRow | null }) {
  return (
    <div className="surface p-5 h-full flex flex-col">
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4 text-[color:var(--accent)]" />
        <span className="eyebrow">Important Note</span>
      </div>
      {note ? (
        <div className="mt-3">
          <div className="font-display text-lg tracking-wide">
            {note.title ?? "Team note"}
          </div>
          <p className="text-sm text-[color:var(--color-muted)] mt-2 whitespace-pre-line">
            {note.body}
          </p>
          <div className="text-xs text-[color:var(--color-muted)] mt-3">
            — Coach
          </div>
        </div>
      ) : (
        <p className="text-sm text-[color:var(--color-muted)] mt-3">
          No pinned notes. Coach can pin one from the Match Log.
        </p>
      )}
    </div>
  );
}
