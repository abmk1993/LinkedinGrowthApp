"use client";

import { KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { inputClassName } from "./Field";

interface SelectProps {
  /** Put on the trigger button, so a surrounding <label htmlFor> names it. */
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  required?: boolean;
}

/**
 * A listbox dropdown whose chevron flips while it's open — a native
 * <select> draws its own arrow, which never reflects the open state.
 * Keyboard: arrows/Home/End move, Enter/Space pick, Escape/Tab close,
 * and typing a letter jumps to the next option starting with it.
 */
export function Select({ id, value, onChange, options, placeholder = "Select one", required }: SelectProps) {
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  function open() {
    setActiveIndex(Math.max(0, options.indexOf(value)));
    setIsOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    if (option !== undefined) onChange(option);
    setIsOpen(false);
    buttonRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (!isOpen) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        open();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(activeIndex);
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      case "Tab":
        setIsOpen(false);
        break;
      default:
        if (e.key.length === 1) {
          const letter = e.key.toLowerCase();
          const start = activeIndex + 1;
          const ordered = [...options.slice(start), ...options.slice(0, start)];
          const match = ordered.find((o) => o.toLowerCase().startsWith(letter));
          if (match) setActiveIndex(options.indexOf(match));
        }
    }
  }

  const activeId = isOpen && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-activedescendant={activeId}
        aria-required={required}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={handleKeyDown}
        className={`${inputClassName} flex items-center justify-between text-left`}
      >
        <span className={value ? "text-ink-900" : "text-ink-300"}>{value || placeholder}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={`h-4 w-4 shrink-0 text-ink-500 transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <path
            d="M5 7.5l5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Keeps native form validation (the browser's "please select" bubble)
          working for a required field; invisible and out of the tab order. */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value}
          onChange={() => {}}
          className="pointer-events-none absolute bottom-0 left-1/2 h-px w-px opacity-0"
        />
      )}

      {isOpen && (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={id}
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-card border border-ink-100 bg-paper-raised py-1 shadow-lg"
        >
          {options.map((option, index) => (
            <li
              key={option}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option === value}
              onPointerEnter={() => setActiveIndex(index)}
              // pointerdown, not click, so the choice lands before the button blurs.
              onPointerDown={(e) => {
                e.preventDefault();
                choose(index);
              }}
              className={`flex cursor-pointer items-center justify-between px-3.5 py-2 text-sm ${
                index === activeIndex ? "bg-brass-100 text-ink-900" : "text-ink-700"
              }`}
            >
              {option}
              {option === value && (
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 text-brass-600">
                  <path
                    d="M5 10.5l3.5 3.5L15 7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
