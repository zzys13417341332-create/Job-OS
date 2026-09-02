"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev.slice(-3), { id, tone, message }]);
      window.setTimeout(() => dismiss(id), 3200);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => dismiss(item.id)}
            className={cn(
              "pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-surface px-3.5 py-3 text-left text-[13px] leading-5 shadow-pop animate-fade-in",
              item.tone === "success" && "border-green-line",
              item.tone === "error" && "border-red-line",
              item.tone === "info" && "border-blue-line"
            )}
          >
            {item.tone === "success" ? (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green" />
            ) : item.tone === "error" ? (
              <XCircle size={16} className="mt-0.5 shrink-0 text-red" />
            ) : (
              <Info size={16} className="mt-0.5 shrink-0 text-blue" />
            )}
            <span className="text-inkSoft">{item.message}</span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast 必须在 ToastProvider 内使用");
  return ctx;
}
