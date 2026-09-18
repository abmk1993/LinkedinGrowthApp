interface LinkedInPreviewProps {
  /** The full post as it will be pasted — build it with composePostText. */
  text: string;
}

// LinkedIn doesn't publish an exact cutoff — creator tools in this space
// commonly cite ~210 characters before "…see more" appears on desktop,
// which is what this approximates. Treat it as a guide, not a guarantee.
const TRUNCATE_AT = 210;

export function LinkedInPreview({ text: combined }: LinkedInPreviewProps) {
  const isTruncated = combined.length > TRUNCATE_AT;
  const visible = isTruncated ? combined.slice(0, TRUNCATE_AT).trimEnd() : combined;
  const hiddenCount = combined.length - visible.length;

  return (
    <div className="rounded-card border border-ink-100 bg-paper-raised p-4">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 rounded-full bg-ink-100" />
        <div>
          <div className="h-3 w-32 rounded bg-ink-100" />
          <div className="mt-1.5 h-2.5 w-24 rounded bg-ink-100" />
        </div>
      </div>

      {combined ? (
        <p className="mt-4 whitespace-pre-wrap text-sm text-ink-900">
          {visible}
          {isTruncated && (
            <>
              <span className="text-ink-300">… </span>
              <span className="font-semibold text-ink-500">see more</span>
            </>
          )}
        </p>
      ) : (
        <p className="mt-4 text-sm text-ink-300">Nothing to preview yet</p>
      )}

      {isTruncated && (
        <p className="mt-3 text-xs text-ink-500">
          ~{hiddenCount} more characters are hidden behind &quot;see more&quot; — most
          scrollers only ever read the text above the fold.
        </p>
      )}

      <div className="mt-4 flex items-center gap-4 border-t border-ink-100 pt-3 text-xs font-medium text-ink-500">
        <span>Like</span>
        <span>Comment</span>
        <span>Share</span>
      </div>
    </div>
  );
}
