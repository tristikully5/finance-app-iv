import { useMemo, useRef, useState } from "react";

type TagInputProps = {
  name: string;
  tags: string[];
  suggestions?: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  onDone?: () => void;
};

function normalizeTag(value: string) {
  return value.trim().replace(/^#+/, "");
}

export default function TagInput({ name, tags, suggestions = [], onChange, placeholder = "Add a tag", onDone }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const availableSuggestions = useMemo(() => {
    const query = draft.trim().toLowerCase();
    return suggestions.filter((suggestion, index) => {
      const normalized = normalizeTag(suggestion);
      return normalized && !tags.some((tag) => tag.toLowerCase() === normalized.toLowerCase()) && suggestions.findIndex((item) => normalizeTag(item).toLowerCase() === normalized.toLowerCase()) === index && (!query || normalized.toLowerCase().includes(query));
    }).slice(0, 8);
  }, [draft, suggestions, tags]);

  const addTag = (value: string) => {
    const nextTag = normalizeTag(value);
    if (!nextTag || tags.some((tag) => tag.toLowerCase() === nextTag.toLowerCase())) {
      setDraft("");
      return;
    }

    onChange([...tags, nextTag]);
    setDraft("");
    inputRef.current?.focus();
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className="relative min-w-0">
      <input type="hidden" name={name} value={JSON.stringify(tags)} />
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 transition focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex max-w-full items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-700">
            <span className="max-w-40 truncate">{tag}</span>
            <button type="button" onClick={() => removeTag(tag)} className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-violet-400 hover:bg-violet-100 hover:text-violet-700" aria-label={`Remove ${tag}`}>×</button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag(draft);
            } else if (event.key === "Backspace" && !draft && tags.length > 0) {
              removeTag(tags[tags.length - 1]);
            }
          }}
          placeholder={tags.length === 0 ? placeholder : "Add tag"}
          className="min-w-24 flex-1 border-0 bg-transparent px-0.5 py-1 text-sm text-slate-900 outline-none placeholder:text-slate-400"
          aria-label="Transaction tags"
        />
      </div>

      {focused && availableSuggestions.length > 0 ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-slate-200 bg-white p-1 shadow-xl" role="listbox">
          {availableSuggestions.map((suggestion) => (
            <button key={suggestion} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => addTag(suggestion)} className="block w-full rounded-md px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-violet-50 hover:text-violet-700" role="option">
              {normalizeTag(suggestion)}
            </button>
          ))}
        </div>
      ) : null}

      {onDone ? <button type="button" onClick={onDone} className="mt-1.5 text-[10px] font-semibold text-slate-500 hover:text-slate-800">Done</button> : null}
    </div>
  );
}
