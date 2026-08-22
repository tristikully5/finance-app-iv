import TagInput from "@/components/TagInput";
import { useState } from "react";

type TransactionTagsCellProps = {
  tags: string[];
  suggestions?: string[];
  onSave: (tags: string[]) => Promise<void> | void;
};

export default function TransactionTagsCell({ tags, suggestions = [], onSave }: TransactionTagsCellProps) {
  const [editing, setEditing] = useState(false);
  const [draftTags, setDraftTags] = useState(tags);

  if (editing) {
    return (
      <TagInput
        name="inline-tags"
        tags={draftTags}
        suggestions={suggestions}
        onChange={setDraftTags}
        onDone={async () => {
          await onSave(draftTags);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <button type="button" onClick={() => { setDraftTags(tags); setEditing(true); }} className="flex min-h-5 w-full flex-wrap gap-1 rounded px-0 py-0.5 text-left hover:bg-slate-50" aria-label={tags.length > 0 ? "Edit transaction tags" : "Add transaction tag"}>
      {tags.length > 0 ? tags.map((tag) => <span key={tag} className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">{tag}</span>) : <span className="text-[10px] text-slate-400">+ Add tag</span>}
    </button>
  );
}
