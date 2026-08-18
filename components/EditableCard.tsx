"use client";

import { useRouter } from "next/navigation";
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
  cardHref?: string;
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
  cardHref,
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
        className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md ${isNavigable ? "cursor-pointer" : ""} ${className ?? ""}`}
        onClick={isNavigable ? handleCardClick : undefined}
        onKeyDown={isNavigable ? handleCardKeyDown : undefined}
        tabIndex={cardHref ? 0 : undefined}
        role={cardHref ? "link" : undefined}
      >
        <div className="flex items-start justify-between gap-3">
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

        <div className="mt-4 space-y-3">{children}</div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-[1px]" onClick={closeModal}>
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">{modalTitle ?? `Edit ${title}`}</h2>
                {modalDescription ? <p className="mt-1 text-xs text-slate-500">{modalDescription}</p> : null}
                {modalHeaderContent ? <div className="mt-4">{modalHeaderContent}</div> : null}
              </div>
              <button type="button" onClick={closeModal} className="text-xl leading-none text-slate-400 transition hover:text-slate-700" aria-label="Close dialog">
                ×
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {editContent}
              {onDelete ? (
                <div className="flex justify-start pt-1"><button type="button" onClick={onDelete} className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700">Delete</button></div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
