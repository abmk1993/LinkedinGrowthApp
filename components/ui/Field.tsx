import { ReactNode } from "react";

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-900">
        {label}
      </label>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1.5 text-sm text-signal-bad">{error}</p>}
    </div>
  );
}

export const inputClassName =
  "block w-full rounded-card border border-ink-100 bg-paper-raised px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:border-brass-500 focus:outline-none focus:ring-1 focus:ring-brass-500";
