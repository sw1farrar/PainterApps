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
        className="rounded-md border border-blue-500/20 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:border-blue-500/35 hover:bg-blue-50"
      >
        {selectAllLabel}
      </button>
      <button
        type="button"
        onClick={onClearAll}
        className="rounded-md border border-silver-300/80 bg-white px-3 py-1.5 text-xs font-semibold text-silver-600 transition hover:border-silver-400 hover:bg-silver-50 hover:text-navy-800"
      >
        {clearAllLabel}
      </button>
    </div>
  );
}