import { Toast as BaseToast } from "@base-ui/react/toast";
import { XIcon } from "@phosphor-icons/react";
import * as React from "react";

import { Icon } from "./icon";

export type ToastStatus = "neutral" | "success" | "warning" | "danger";

export interface ToastOptions {
  /** One line saying what happened: "Sandbox deleted". */
  title: string;
  /** Optional detail. */
  description?: string;
  /** `warning` and `danger` add a dot; the title still says it in words. `success` is the same as neutral. */
  status?: ToastStatus;
  /** A single follow-up action, e.g. "Undo". */
  action?: { label: string; onClick: () => void };
  /** Milliseconds before it closes; 0 keeps it until dismissed. Base UI's default (5s) otherwise. */
  timeout?: number;
}

/**
 * Place once near the root of the app. Toasts appear bottom-right, stack, expand on hover
 * or focus, pause while hovered, and are announced to screen readers.
 */
export function ToastProvider({ children, limit = 3 }: { children: React.ReactNode; limit?: number }) {
  return (
    <BaseToast.Provider limit={limit}>
      {children}
      <BaseToast.Portal>
        <BaseToast.Viewport className="basalt-toast-viewport">
          <ToastList />
        </BaseToast.Viewport>
      </BaseToast.Portal>
    </BaseToast.Provider>
  );
}

const toastTimeouts = new Map<string, number>();

function ToastList() {
  const { toasts } = BaseToast.useToastManager();
  return toasts.map((toast) => {
    const timeout = toastTimeouts.get(String(toast.id)) ?? 0;
    return (
    <BaseToast.Root key={toast.id} toast={toast} className="basalt-toast" data-status={(toast.type as ToastStatus | undefined) ?? "neutral"}>
      {timeout > 0 ? <span className="basalt-toast-drain" style={{ animationDuration: `${timeout}ms` }} /> : null}
      <BaseToast.Content className="basalt-toast-content">
        {/* a dot only where it warns; the title says what happened */}
        {toast.type === "danger" || toast.type === "warning" ? <span className="basalt-badge-dot basalt-toast-dot" aria-hidden="true" /> : null}
        <div className="basalt-toast-text">
          <BaseToast.Title className="basalt-toast-title" />
          <BaseToast.Description className="basalt-toast-description" />
        </div>
        {toast.actionProps ? <BaseToast.Action className="basalt-button basalt-toast-action" data-variant="secondary" data-size="xs" /> : null}
        <BaseToast.Close className="basalt-button basalt-toast-close" data-variant="ghost" data-size="xs" data-icon-only="" aria-label="Dismiss">
          <Icon icon={XIcon} size={16} />
        </BaseToast.Close>
      </BaseToast.Content>
    </BaseToast.Root>
    );
  });
}

/**
 * Show a toast from anywhere inside `ToastProvider`. Returns its id, for `close`. The returned
 * object is stable across renders, so it is safe in effect dependencies.
 */
export function useToast() {
  // Base UI's manager object changes whenever the toast list does; keep the latest in a ref so
  // this hook's result never changes identity (an effect that shows a toast would loop).
  const manager = BaseToast.useToastManager();
  const latest = React.useRef(manager);
  latest.current = manager;
  return React.useMemo(
    () => ({
      show: ({ title, description, status = "neutral", action, timeout }: ToastOptions) => {
        const id = latest.current.add({
          title,
          description,
          type: status,
          timeout,
          actionProps: action ? { children: action.label, onClick: action.onClick } : undefined,
        });
        toastTimeouts.set(String(id), timeout === undefined ? 5000 : timeout);
        return id;
      },
      close: (id: string) => latest.current.close(id),
    }),
    [],
  );
}
