// A page change without a reload, said once to whatever listens: the toast stack closes the toasts that only echoed the page that left.
// `useRouteFocus` says it; an app with its own router can say it through `useToast().pageChanged()`. Nothing is allocated at import.

let listeners: Set<() => void> | undefined;

export function onPageChange(listener: () => void): () => void {
  (listeners ??= new Set()).add(listener);
  return () => { listeners?.delete(listener); };
}

export function pageChanged(): void {
  for (const listener of [...(listeners ?? [])]) listener();
}
