import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[84px] w-full rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-sm text-[color:var(--color-text)] placeholder:text-[color:var(--color-muted)] transition-colors",
        "hover:border-white/15 focus:border-[color:var(--accent-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]",
        "disabled:cursor-not-allowed disabled:opacity-50 resize-y",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
