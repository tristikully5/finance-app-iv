export type TransactionDialogPreset = {
  showType: boolean;
  showDate: boolean;
  showAmount: boolean;
  showCategory: boolean;
  showAccount: boolean;
  showDestination: boolean;
  showName: boolean;
  showDescription: boolean;
  showTags: boolean;
  showDelete: boolean;
};

export const transactionDialogPresets = {
  add: {
    showType: true,
    showDate: true,
    showAmount: true,
    showCategory: true,
    showAccount: true,
    showDestination: true,
    showName: true,
    showDescription: true,
    showTags: true,
    showDelete: false,
  },
  edit: {
    showType: true,
    showDate: true,
    showAmount: true,
    showCategory: true,
    showAccount: true,
    showDestination: true,
    showName: true,
    showDescription: true,
    showTags: true,
    showDelete: true,
  },
} satisfies Record<string, TransactionDialogPreset>;
