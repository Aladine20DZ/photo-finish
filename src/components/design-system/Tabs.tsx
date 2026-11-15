import React from 'react';
import { motion } from 'framer-motion';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div
      className={`flex items-center p-1 rounded-[var(--radius-sm,2px)] bg-[var(--surface-alt,#F3F3F1)] border border-[var(--border,#DADAD6)] gap-1 overflow-x-auto no-scrollbar ${className}`}
      dir="rtl"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`
              relative px-3.5 py-1.5 rounded-[var(--radius-sm,2px)] text-xs font-bold transition-all whitespace-nowrap cursor-pointer
              flex items-center gap-1.5 select-none z-10
              ${isActive ? 'text-[var(--block,#0A0A0A)] font-black' : 'text-[var(--ink-2,#4A4A47)] hover:text-[var(--ink,#0A0A0A)] hover:bg-[var(--surface,#FFFFFF)]/70'}
            `}
          >
            {isActive && (
              <motion.div
                layoutId="activeTabPill"
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute inset-0 bg-[var(--surface,#FFFFFF)] rounded-[var(--radius-sm,2px)] -z-10 border border-[var(--border-strong,#0A0A0A)]"
              />
            )}
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-athletic font-bold tabular-nums ${
                  isActive ? 'bg-[var(--accent,#E5321B)] text-white' : 'bg-[var(--border,#DADAD6)] text-[var(--ink-2,#4A4A47)]'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
