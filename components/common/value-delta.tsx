import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function ValueDelta({
  value,
  suffix = "",
  positiveIsGood = true,
}: {
  value: number;
  suffix?: string;
  positiveIsGood?: boolean;
}) {
  if (value === 0)
    return <span className="text-[color:var(--color-muted)] text-xs">flat</span>;
  const good = positiveIsGood ? value > 0 : value < 0;
  const Icon = value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold",
        good ? "text-green-400" : "text-red-400",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {value > 0 ? "+" : ""}
      {value.toFixed(2)}
      {suffix}
    </span>
  );
}
