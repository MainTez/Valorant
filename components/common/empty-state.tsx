import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-3 rounded-xl border border-dashed border-white/10 py-10 px-6",
        className,
      )}
    >
      {Icon ? (
        <div className="rounded-full p-3 bg-[color:var(--accent-dim)] text-[color:var(--accent)]">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <div>
        <p className="font-display text-lg tracking-wide">{title}</p>
        {description ? (
          <p className="text-sm text-[color:var(--color-muted)] mt-1 max-w-sm mx-auto">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
