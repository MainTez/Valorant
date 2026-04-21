import { cn } from "@/lib/utils";

interface Props {
  eyebrow: string;
  title?: string;
  right?: React.ReactNode;
  className?: string;
}

export function SectionTitle({ eyebrow, title, right, className }: Props) {
  return (
    <div className={cn("flex items-center justify-between mb-3", className)}>
      <div>
        <div className="eyebrow">{eyebrow}</div>
        {title ? (
          <h2 className="font-display text-xl tracking-wide mt-1">{title}</h2>
        ) : null}
      </div>
      {right ? <div>{right}</div> : null}
    </div>
  );
}
