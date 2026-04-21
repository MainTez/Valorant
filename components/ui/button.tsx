import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-0",
  {
    variants: {
      variant: {
        accent:
          "bg-[color:var(--accent)] text-[#0a0d15] hover:brightness-110 hover:shadow-[0_0_22px_-4px_var(--accent-soft)] border border-[color:var(--accent)]",
        outline:
          "border border-white/10 bg-white/[0.02] text-[color:var(--color-text)] hover:border-[color:var(--accent-soft)] hover:bg-white/[0.05]",
        ghost:
          "text-[color:var(--color-text)] hover:bg-white/[0.04]",
        danger:
          "bg-[color:var(--color-danger)] text-white hover:brightness-110 border border-[color:var(--color-danger)]",
        subtle:
          "bg-white/[0.03] text-[color:var(--color-text)] border border-white/5 hover:bg-white/[0.06]",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-5 text-base",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: { variant: "accent", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
