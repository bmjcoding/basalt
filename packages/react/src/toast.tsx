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
    <BaseToast.Provider limit={limit} timeout={DEFAULT_TIMEOUT}>
      {children}
      <BaseToast.Portal>
        <ToastStack />
      </BaseToast.Portal>
    </BaseToast.Provider>
  );
}

// Stated here rather than left to Base UI, because the drain line must last as long as the timer.
const DEFAULT_TIMEOUT = 5000;

function ToastStack() {
  const { toasts } = BaseToast.useToastManager();
  const blurred = useWindowBlurred(toasts.length > 0);
  return (
    <BaseToast.Viewport className="basalt-toast-viewport" data-window-blurred={blurred ? "" : undefined}>
      <ToastList />
    </BaseToast.Viewport>
  );
}

/**
 * Base UI holds every toast's timer while the window is not focused, as it does while the stack
 * is hovered or focused. The drain line pauses with them, so the line and the timer stay in step.
 *
 * Base UI watches the window only while a toast is on screen, so a blur or focus while the stack is empty
 * never reaches its timers. This watches over exactly the same span (`watching`): otherwise a first
 * toast shown after a blur would have a paused line and a running timer.
 */
function useWindowBlurred(watching: boolean) {
  const [blurred, setBlurred] = React.useState(false);
  React.useEffect(() => {
    if (!watching) return;
    let refocus = 0;
    const blur = (event: Event) => {
      if (event.target !== window) return;
      window.clearTimeout(refocus);
      setBlurred(true);
    };
    const focus = (event: FocusEvent) => {
      if (event.relatedTarget) return;
      // After focus events have settled, as Base UI waits before it lets its timers run.
      refocus = window.setTimeout(() => setBlurred(false), 0);
    };
    window.addEventListener("blur", blur, true);
    window.addEventListener("focus", focus, true);
    return () => {
      // A refocus already under way is left to finish, so the state is never stuck on blurred.
      window.removeEventListener("blur", blur, true);
      window.removeEventListener("focus", focus, true);
    };
  }, [watching]);
  return blurred;
}

function ToastList() {
  const { toasts } = BaseToast.useToastManager();
  return toasts.map((toast) => {
    // The timeout lives on the toast itself, so nothing outlives it.
    const timeout = toast.timeout ?? DEFAULT_TIMEOUT;
    return (
    <BaseToast.Root key={toast.id} toast={toast} data-level={3} className="basalt-toast" data-status={(toast.type as ToastStatus | undefined) ?? "neutral"}>
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
        return latest.current.add({
          title,
          description,
          type: status,
          timeout,
          actionProps: action ? { children: action.label, onClick: action.onClick } : undefined,
        });
      },
      close: (id: string) => latest.current.close(id),
    }),
    [],
  );
}
