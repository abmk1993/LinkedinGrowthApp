"use client";

import { KeyboardEvent, useState } from "react";
import { inputClassName } from "./Field";

interface TagInputProps {
  /** Put on the text input, so a surrounding <label htmlFor> points at it. */
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}

export function TagInput({ id, value, onChange, placeholder, maxTags = 30 }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const atLimit = value.length >= maxTags;

  function commitDraft() {
    const trimmed = draft.trim();
    if (!trimmed || atLimit) return;
    if (value.includes(trimmed)) {
      setDraft("");
      return;
    }
    onChange([...value, trimmed]);
    setDraft("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  return (
    <div>
      <div className={`${inputClassName} flex flex-wrap gap-2`}>
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-brass-100 px-2.5 py-1 text-xs font-medium text-ink-900"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
              className="text-ink-500 hover:text-ink-900"
            >
              ×
            </button>
          </span>
        ))}
        {!atLimit && (
          <input
            id={id}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitDraft}
            placeholder={value.length === 0 ? placeholder : undefined}
            className="min-w-[8ch] flex-1 border-none bg-transparent p-0 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-0"
          />
        )}
      </div>
      <p className="mt-1 text-xs text-ink-500">
        {atLimit
          ? `Limit of ${maxTags} reached — remove one to add another`
          : "Press Enter or comma to add"}
      </p>
    </div>
  );
}
