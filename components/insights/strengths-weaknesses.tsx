import { CheckCircle2, AlertTriangle } from "lucide-react";

export function StrengthsWeaknesses({
  strengths,
  weaknesses,
  improvements,
}: {
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <List
        title="Strengths"
        accent="green"
        icon={<CheckCircle2 className="h-4 w-4" />}
        items={strengths}
        empty="No standout strengths yet."
      />
      <List
        title="Weaknesses"
        accent="red"
        icon={<AlertTriangle className="h-4 w-4" />}
        items={weaknesses}
        empty="No flagged weaknesses."
      />
      <div className="surface p-5 md:col-span-1">
        <div className="eyebrow">Suggestions</div>
        <ul className="mt-3 flex flex-col gap-2">
          {improvements.length === 0 ? (
            <li className="text-sm text-[color:var(--color-muted)]">
              Keep doing what works.
            </li>
          ) : (
            improvements.map((s, i) => (
              <li
                key={i}
                className="relative pl-4 text-sm leading-snug"
              >
                <span className="absolute left-0 top-[0.55em] h-1 w-1 rounded-full bg-[color:var(--accent)]" />
                {s}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

function List({
  title,
  accent,
  icon,
  items,
  empty,
}: {
  title: string;
  accent: "green" | "red";
  icon: React.ReactNode;
  items: string[];
  empty: string;
}) {
  const color =
    accent === "green"
      ? "text-green-400 border-green-500/30 bg-green-500/[0.06]"
      : "text-red-400 border-red-500/30 bg-red-500/[0.06]";
  return (
    <div className="surface p-5">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center justify-center rounded-md border p-1 ${color}`}>
          {icon}
        </span>
        <div className="eyebrow">{title}</div>
      </div>
      <ul className="mt-3 flex flex-col gap-1.5">
        {items.length === 0 ? (
          <li className="text-sm text-[color:var(--color-muted)]">{empty}</li>
        ) : (
          items.map((s, i) => (
            <li key={i} className="text-sm">
              {s}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
