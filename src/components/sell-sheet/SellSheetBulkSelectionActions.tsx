type SellSheetBulkSelectionActionsProps = {
  selectAllLabel: string;
  clearAllLabel: string;
  onSelectAll: () => void;
  onClearAll: () => void;
};

export function SellSheetBulkSelectionActions({
  selectAllLabel,
  clearAllLabel,
  onSelectAll,
  onClearAll,
}: SellSheetBulkSelectionActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onSelectAll}
        className="rounded-md border border-blue-500/20 bg-card px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:border-blue-500/35 hover:bg-blue-50"
      >
        {selectAllLabel}
      </button>
      <button
        type="button"
        onClick={onClearAll}
        className="rounded-md border border-input bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-input hover:bg-accent hover:text-foreground"
      >
        {clearAllLabel}
      </button>
    </div>
  );
}