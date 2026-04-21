import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type ?? "text"}
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-sm text-[color:var(--color-text)] placeholder:text-[color:var(--color-muted)] transition-colors",
        "hover:border-white/15 focus:border-[color:var(--accent-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
