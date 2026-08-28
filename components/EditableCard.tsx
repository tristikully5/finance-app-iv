"use client";

import { useRouter } from "next/navigation";
import StandardDialog, { type DialogVariant } from "@/components/StandardDialog";
import { useState } from "react";

function useCardModal() {
  const [open, setOpen] = useState(false);

  return {
    open,
    openModal: () => setOpen(true),
    closeModal: () => setOpen(false),
  };
}

type EditableCardProps = {
  title: string;
  subtitle?: string;
  headerContent?: React.ReactNode;
  children: React.ReactNode;
  editContent?: React.ReactNode;
  onDelete?: () => void;
  openOnCardClick?: boolean;
  hideEditButton?: boolean;
  className?: string;
  modalTitle?: string;
  modalDescription?: string;
  modalHeaderContent?: React.ReactNode;
  modalVariant?: DialogVariant;
  cardHref?: string;
  layout?: "default" | "row";
};

export default function EditableCard({
  title,
  subtitle,
  headerContent,
  children,
  editContent,
  onDelete,
  openOnCardClick = false,
  hideEditButton = false,
  className,
  modalTitle,
  modalDescription,
  modalHeaderContent,
  modalVariant = "default",
  cardHref,
  layout = "default",
}: EditableCardProps) {
  const router = useRouter();
  const { open, openModal, closeModal } = useCardModal();
  const isNavigable = Boolean(cardHref) || openOnCardClick;

  const handleCardClick = () => {
    if (cardHref) {
      router.push(cardHref);
      return;
    }

    if (openOnCardClick) {
      openModal();
    }
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!cardHref || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea")) {
      return;
    }

    event.preventDefault();
    router.push(cardHref);
  };

  return (
    <>
      <div
        className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md ${layout === "row" ? "sm:flex sm:items-center sm:gap-6" : ""} ${isNavigable ? "cursor-pointer" : ""} ${className ?? ""}`}
        onClick={isNavigable ? handleCardClick : undefined}
        onKeyDown={isNavigable ? handleCardKeyDown : undefined}
        tabIndex={cardHref ? 0 : undefined}
        role={cardHref ? "link" : undefined}
      >
        <div className={`flex items-start justify-between gap-3 ${layout === "row" ? "sm:w-64 sm:shrink-0" : ""}`}>
          <div className="flex min-w-0 items-start gap-3">
            {headerContent ? <div className="shrink-0 text-2xl">{headerContent}</div> : null}
            <div>
              <h3 className="text-base font-semibold text-gray-900">{title}</h3>
              {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
            </div>
          </div>

          {!hideEditButton ? (
            <button type="button" onClick={(event) => { event.stopPropagation(); openModal(); }} className="rounded border border-gray-200 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-gray-600">
              Edit
            </button>
          ) : null}
        </div>

        <div className={`mt-4 space-y-3 ${layout === "row" ? "sm:mt-0 sm:flex-1" : ""}`}>{children}</div>
      </div>

      {open ? (
        <StandardDialog
          title={modalTitle ?? `Edit ${title}`}
          description={modalDescription}
          headerContent={modalHeaderContent}
          variant={modalVariant}
          onClose={closeModal}
        >
          {editContent}
          {onDelete ? (
            <div className="flex justify-start pt-1"><button type="button" onClick={onDelete} className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700">Delete</button></div>
          ) : null}
        </StandardDialog>
      ) : null}
    </>
  );
}
