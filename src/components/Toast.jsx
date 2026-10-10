import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Check, AlertCircle } from "lucide-react";

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const show = useCallback((message, type = "success") => {
    clearTimeout(timer.current);
    setToast({ message, type, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex justify-center px-4 lg:bottom-6">
          <div
            key={toast.id}
            role="status"
            className="toast-in pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-surface-2 px-4 py-2.5 text-sm font-medium shadow-2xl"
          >
            {toast.type === "error" ? (
              <AlertCircle className="h-4 w-4" style={{ color: "var(--color-coral)" }} />
            ) : (
              <Check className="h-4 w-4" style={{ color: "var(--color-teal)" }} />
            )}
            {toast.message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
