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

function ToastList() {
  const { toasts } = BaseToast.useToastManager();
  return toasts.map((toast) => (
    <BaseToast.Root key={toast.id} toast={toast} className="basalt-toast" data-status={(toast.type as ToastStatus | undefined) ?? "neutral"}>
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
  ));
}

/** Show a toast from anywhere inside `ToastProvider`. Returns its id, for `close`. */
export function useToast() {
  const manager = BaseToast.useToastManager();
  return React.useMemo(
    () => ({
      show: ({ title, description, status = "neutral", action, timeout }: ToastOptions) =>
        manager.add({
          title,
          description,
          type: status,
          timeout,
          actionProps: action ? { children: action.label, onClick: action.onClick } : undefined,
        }),
      close: (id: string) => manager.close(id),
    }),
    [manager],
  );
}
