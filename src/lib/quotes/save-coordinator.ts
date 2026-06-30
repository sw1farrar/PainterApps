export type QuoteSaveResult =
  | { success: true; data?: void }
  | { success: false; error: string };

let saveChain: Promise<unknown> = Promise.resolve();

export function enqueueQuoteSave(
  saveFn: () => Promise<QuoteSaveResult>,
): Promise<QuoteSaveResult> {
  const run = saveChain.then(saveFn, saveFn);
  saveChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}