export type TransactionTableView = "table" | "calendar";

export type TransactionTablePreset = {
  initialView: TransactionTableView;
  showMonthNavigation: boolean;
  showViewToggle: boolean;
  showSearch: boolean;
  showTypeFilter: boolean;
  showQuickAdd: boolean;
  showTableView: boolean;
  showCalendarView: boolean;
  showDayTotals: boolean;
  showAllocationStatus: boolean;
  showSummaryPanels: boolean;
};

export const transactionTablePresets = {
  full: {
    initialView: "calendar",
    showMonthNavigation: true,
    showViewToggle: true,
    showSearch: true,
    showTypeFilter: true,
    showQuickAdd: true,
    showTableView: true,
    showCalendarView: true,
    showDayTotals: true,
    showAllocationStatus: true,
    showSummaryPanels: true,
  },
  allocations: {
    initialView: "table",
    showMonthNavigation: false,
    showViewToggle: false,
    showSearch: true,
    showTypeFilter: false,
    showQuickAdd: false,
    showTableView: true,
    showCalendarView: false,
    showDayTotals: false,
    showAllocationStatus: true,
    showSummaryPanels: false,
  },
} satisfies Record<string, TransactionTablePreset>;

export type TransactionTablePresetName = keyof typeof transactionTablePresets;
