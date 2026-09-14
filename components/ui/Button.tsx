import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-brass-500 text-paper-raised hover:bg-brass-400 disabled:bg-brass-100 disabled:text-ink-300",
  secondary:
    "bg-transparent text-ink-900 border border-ink-100 hover:border-ink-500 disabled:text-ink-300 disabled:border-ink-100",
  ghost:
    "bg-transparent text-ink-700 hover:text-ink-900 disabled:text-ink-300",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", isLoading, disabled, className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center gap-2 rounded-card px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
        {...props}
      >
        {isLoading ? "Working…" : children}
      </button>
    );
  }
);
Button.displayName = "Button";
