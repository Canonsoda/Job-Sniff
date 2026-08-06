import toast from "react-hot-toast";

/**
 * Ask before doing something destructive. Resolves true only if confirmed.
 *
 * Both "Clean Duplicates" and "Clear All" permanently delete resumes and the
 * stored PDF files, so both need this - previously only one of them asked.
 */
export const confirmAction = ({ title, message, confirmLabel = "Confirm" }) =>
  new Promise((resolve) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <div className="text-white font-medium">{title}</div>
          {message && <div className="text-gray-300 text-sm">{message}</div>}
          <div className="flex gap-2">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
            >
              {confirmLabel}
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, position: "top-center" }
    );
  });

export default confirmAction;
