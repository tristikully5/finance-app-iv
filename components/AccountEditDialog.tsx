"use client";

import { archiveAccount, updateAccount } from "@/app/accounts/actions";
import IconPicker from "@/components/IconPicker";
import { defaultIconValue } from "@/lib/icon-options";
import StandardDialog from "@/components/StandardDialog";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type AccountEditDialogProps = {
  account: { id: number; name: string; type: string; currency: string; icon: string | null };
};

const accountTypes = ["Bank", "Cash", "Credit Card", "Investment"];
const currencies = ["SGD", "USD", "EUR"];

export function AccountEditForm({ account, onDone }: AccountEditDialogProps & { onDone?: () => void }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const result = await updateAccount(formData);
        if (result && (result as any).warning === "icon-not-saved") {
          // show user-visible feedback that icon wasn't saved
          // eslint-disable-next-line no-alert
          alert("Saved, but your selected icon couldn't be persisted in this environment.");
        }
        // close the dialog if parent provided onDone
        onDone?.();
        router.refresh();
      } catch (err) {
        console.error("Failed to save account:", err);
        // eslint-disable-next-line no-alert
        alert("Failed to save account. See console for details.");
      }
    });
  };

  const handleArchive = () => {
    const formData = new FormData();
    formData.append("id", String(account.id));
    startTransition(async () => {
      await archiveAccount(formData);
      onDone?.();
      router.push("/accounts");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="id" value={account.id} />
      <div className="flex items-start gap-3">
        <IconPicker name="icon" defaultValue={account.icon || defaultIconValue} type="Account" />
        <label className="account-dialog-field min-w-0 flex-1">Name<input name="name" defaultValue={account.name} required /></label>
      </div>
      <label className="account-dialog-field">Type<select name="type" defaultValue={account.type}>{accountTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
      <label className="account-dialog-field">Currency<select name="currency" defaultValue={account.currency}>{currencies.map((currency) => <option key={currency}>{currency}</option>)}</select></label>
      <div className="flex items-center justify-between gap-3 pt-1">
        <button type="button" onClick={handleArchive} disabled={isPending} className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60">Archive</button>
        <button type="submit" data-dialog-submit disabled={isPending} className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">{isPending ? "Saving..." : "Save changes"}</button>
      </div>
    </form>
  );
}

export default function AccountEditDialog({ account }: AccountEditDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-300"><span aria-hidden="true">↗</span> Edit account</button>
      {open ? (
        <StandardDialog title="Edit account" description="Update this account for your finances." variant="account" onClose={() => setOpen(false)}>
          <AccountEditForm account={account} onDone={() => setOpen(false)} />
        </StandardDialog>
      ) : null}
    </>
  );
}
