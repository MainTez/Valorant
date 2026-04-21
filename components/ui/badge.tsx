import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
  {
    variants: {
      variant: {
        default:
          "border-[color:var(--accent-soft)] bg-[color:var(--accent-dim)] text-[color:var(--accent)]",
        outline:
          "border-white/10 bg-white/[0.03] text-[color:var(--color-muted)]",
        success:
          "border-green-500/35 bg-green-500/10 text-green-400",
        danger:
          "border-red-500/35 bg-red-500/10 text-red-400",
        warning:
          "border-amber-500/35 bg-amber-500/10 text-amber-400",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
