import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  side?: 'right' | 'left';
  width?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  side = 'right',
  width = 'w-80 sm:w-96',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const slideInitial = side === 'right' ? { x: '100%' } : { x: '-100%' };
  const slideExit = side === 'right' ? { x: '100%' } : { x: '-100%' };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75"
          />

          <div className={`fixed inset-y-0 ${side === 'right' ? 'right-0' : 'left-0'} flex max-w-full`}>
            <motion.div
              initial={slideInitial}
              animate={{ x: 0 }}
              exit={slideExit}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`
                ${width} h-full bg-[var(--surface)] text-[var(--ink)] p-6 border-y-0 ${side === 'right' ? 'border-l' : 'border-r'}
                border-[var(--border)] shadow-[var(--shadow-2)] flex flex-col justify-between overflow-y-auto z-10
              `}
            >
              <div>
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border)]">
                  {title && <h3 className="text-base font-bold text-[var(--ink)]">{title}</h3>}
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--ink-2)] hover:text-[var(--ink)] transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
