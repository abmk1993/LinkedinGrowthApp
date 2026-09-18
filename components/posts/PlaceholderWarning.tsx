import { findPlaceholders } from "@/lib/posts/composePost";

interface PlaceholderWarningProps {
  text: string;
  className?: string;
}

/**
 * The content agent leaves "[Add a real example: ...]" markers instead of
 * inventing experiences — this keeps them from being pasted into LinkedIn
 * unfilled.
 */
export function PlaceholderWarning({ text, className = "" }: PlaceholderWarningProps) {
  const placeholders = findPlaceholders(text);
  if (placeholders.length === 0) return null;

  return (
    <div
      role="status"
      className={`rounded-card border border-signal-warn/30 bg-signal-warn/5 p-3 text-sm text-signal-warn ${className}`}
    >
      <p className="font-medium">
        {placeholders.length === 1
          ? "1 spot needs your own example"
          : `${placeholders.length} spots need your own examples`}{" "}
        — replace the bracketed text before posting:
      </p>
      <ul className="mt-1 list-disc pl-5">
        {placeholders.map((p, i) => (
          <li key={`${i}-${p}`}>{p}</li>
        ))}
      </ul>
    </div>
  );
}
