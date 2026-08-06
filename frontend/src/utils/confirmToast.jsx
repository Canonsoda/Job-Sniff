import toast from "react-hot-toast";
import { AlertTriangle } from "lucide-react";

/**
 * Ask before doing something destructive. Resolves true only if confirmed.
 *
 * Styled to match the dashboard: dark glass panel, white/10 borders, and the
 * same red-tinted destructive button used for "Clean Duplicates" and
 * "Clear All". The toast container itself is made transparent so this panel is
 * the only visible surface - react-hot-toast otherwise renders a white card,
 * which would put white text on a white background.
 */
export const confirmAction = ({ title, message, confirmLabel = "Confirm" }) =>
  new Promise((resolve) => {
    let toastId;

    const finish = (result) => {
      window.removeEventListener("keydown", onKeyDown);
      toast.dismiss(toastId);
      resolve(result);
    };

    // Escape cancels, as in any dialog
    const onKeyDown = (e) => {
      if (e.key === "Escape") finish(false);
    };
    window.addEventListener("keydown", onKeyDown);

    toastId = toast(
      (t) => (
        <div
          role="alertdialog"
          aria-modal="true"
          className={`w-full rounded-2xl border border-white/10 bg-[#0f0f1c]/95 p-5 shadow-2xl backdrop-blur-md transition-all duration-200 ${
            t.visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
        >
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/20">
              <AlertTriangle className="h-5 w-5 text-red-300" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-white">{title}</h3>
              {message && (
                <p className="mt-1 text-sm leading-relaxed text-gray-400">{message}</p>
              )}

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => finish(false)}
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-white/20 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  autoFocus
                  onClick={() => finish(true)}
                  className="rounded-xl border border-red-500/30 bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-300 transition hover:border-red-500/50 hover:bg-red-500/30 hover:text-red-200"
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        duration: Infinity,
        position: "top-center",
        // Strip the default white card so only the panel above shows
        style: {
          background: "transparent",
          boxShadow: "none",
          padding: 0,
          margin: 0,
          maxWidth: "440px",
          width: "calc(100vw - 2rem)",
        },
      }
    );
  });

export default confirmAction;
