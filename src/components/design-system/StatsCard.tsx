import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from 'lucide-react';

export interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string | number;
  isPositive?: boolean;
  icon?: LucideIcon | React.ElementType;
  gradient?: string;
  subtitle?: string;
  className?: string;
  onClick?: () => void;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  isPositive = true,
  icon: Icon,
  subtitle,
  className = '',
  onClick,
}) => {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={`
        bg-[var(--surface,#FFFFFF)] text-[var(--ink,#0A0A0A)] p-5 rounded-[var(--radius-sm,2px)]
        border border-[var(--border,#DADAD6)] border-t-[3px] border-t-[var(--block,#0A0A0A)]
        shadow-none transition-colors duration-150 cursor-pointer
        relative overflow-hidden group ${className}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-[var(--ink-2,#4A4A47)] font-black">{title}</p>
          <div className="text-4xl lg:text-5xl font-black text-[var(--block,#0A0A0A)] font-athletic tracking-tight tabular-nums leading-none py-1">
            {value}
          </div>
          
          {change !== undefined && (
            <p className={`flex items-center gap-1 text-xs font-bold ${isPositive ? 'text-[var(--success,#0E7A3E)]' : 'text-[var(--danger,#B3261E)]'}`}>
              {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span className="tabular-nums font-athletic">{change}%</span>
              {subtitle && <span className="text-[var(--ink-3,#7C7C77)] font-normal mr-1">{subtitle}</span>}
            </p>
          )}

          {change === undefined && subtitle && (
            <p className="text-xs text-[var(--ink-3,#7C7C77)]">{subtitle}</p>
          )}
        </div>

        {Icon && (
          <div className="w-10 h-10 rounded-[var(--radius-sm,2px)] bg-[var(--surface-alt,#F3F3F1)] text-[var(--block,#0A0A0A)] border border-[var(--border,#DADAD6)] flex items-center justify-center shrink-0">
            <Icon size={18} className="stroke-[2.5]" />
          </div>
        )}
      </div>
    </motion.div>
  );
};
