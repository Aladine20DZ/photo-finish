import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface ToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-[var(--success)] shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-[var(--warning)] shrink-0" />,
  error: <XCircle className="w-5 h-5 text-[var(--danger)] shrink-0" />,
  info: <Info className="w-5 h-5 text-[var(--info)] shrink-0" />,
};

const borderStyles: Record<ToastType, string> = {
  success: 'border-r-4 border-r-[var(--success)] border-[var(--border)]',
  warning: 'border-r-4 border-r-[var(--warning)] border-[var(--border)]',
  error: 'border-r-4 border-r-[var(--danger)] border-[var(--border)]',
  info: 'border-r-4 border-r-[var(--info)] border-[var(--border)]',
};

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none" dir="rtl">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={`
              bg-[var(--surface)] text-[var(--ink)] p-4 rounded-xl border ${borderStyles[t.type]}
              pointer-events-auto flex items-start gap-3 shadow-[var(--shadow-2)] text-right
            `}
          >
            {icons[t.type]}
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-[var(--ink)]">{t.title}</h4>
              {t.message && <p className="text-[11px] text-[var(--ink-2)] mt-0.5 leading-snug">{t.message}</p>}
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              className="text-[var(--ink-3)] hover:text-[var(--ink)] p-1 rounded-lg transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
