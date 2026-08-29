/**
 * Toast "Guardado · Deshacer" de 5 s. No bloquea escribir ni navegar.
 * Se anuncia con aria-live para que tambien exista sin verlo.
 */

import { useStore } from "../state/store";

export function Toast() {
  const { toast, dismissToast } = useStore();

  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {toast && (
        <div className="toast">
          <span>{toast.text}</span>
          {toast.actionLabel && (
            <button
              type="button"
              className="toast__action"
              onClick={() => { toast.action?.(); dismissToast(); }}
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
