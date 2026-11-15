import React from 'react';
import { 
  FileEdit, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Lock
} from 'lucide-react';

export type BadgeStatus = 'draft' | 'review' | 'certified' | 'rejected' | 'locked';

export interface BadgeProps {
  status?: BadgeStatus;
  variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'accent' | 'info';
  dot?: boolean;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

const statusConfigs: Record<BadgeStatus, { label: string; icon: React.ReactNode; style: string }> = {
  draft: {
    label: 'مسودة',
    icon: <FileEdit className="w-3 h-3 text-[var(--ink-2)]" />,
    style: 'bg-[var(--surface-2)] text-[var(--ink-2)] border-[var(--border)]',
  },
  review: {
    label: 'قيد المراجعة',
    icon: <Clock className="w-3 h-3 text-[var(--warning)]" />,
    style: 'bg-amber-50 dark:bg-amber-950/40 text-[var(--warning)] border-amber-200 dark:border-amber-800',
  },
  certified: {
    label: 'معتمد',
    icon: <CheckCircle2 className="w-3 h-3 text-[var(--success)]" />,
    style: 'bg-emerald-50 dark:bg-emerald-950/40 text-[var(--success)] border-emerald-200 dark:border-emerald-800',
  },
  rejected: {
    label: 'مرفوض',
    icon: <XCircle className="w-3 h-3 text-[var(--danger)]" />,
    style: 'bg-red-50 dark:bg-red-950/40 text-[var(--danger)] border-red-200 dark:border-red-800',
  },
  locked: {
    label: 'مقفل',
    icon: <Lock className="w-3 h-3 text-[var(--info)]" />,
    style: 'bg-sky-50 dark:bg-sky-950/40 text-[var(--info)] border-sky-200 dark:border-sky-800',
  },
};

const variantStyles = {
  success: 'bg-emerald-50 dark:bg-emerald-950/40 text-[var(--success)] border-emerald-200 dark:border-emerald-800',
  warning: 'bg-amber-50 dark:bg-amber-950/40 text-[var(--warning)] border-amber-200 dark:border-amber-800',
  danger: 'bg-red-50 dark:bg-red-950/40 text-[var(--danger)] border-red-200 dark:border-red-800',
  neutral: 'bg-[var(--surface-2)] text-[var(--ink-2)] border-[var(--border)]',
  accent: 'bg-[var(--accent-soft)] text-[var(--accent)] border-orange-200 dark:border-orange-800',
  info: 'bg-[var(--primary-soft)] text-[var(--primary)] border-blue-200 dark:border-blue-800',
};

const dotColors = {
  success: 'bg-[var(--success)]',
  warning: 'bg-[var(--warning)]',
  danger: 'bg-[var(--danger)]',
  neutral: 'bg-[var(--ink-3)]',
  accent: 'bg-[var(--accent)]',
  info: 'bg-[var(--info)]',
};

export const Badge: React.FC<BadgeProps> = ({
  status,
  variant = 'neutral',
  dot = false,
  size = 'md',
  icon,
  className = '',
  children,
}) => {
  if (status && statusConfigs[status]) {
    const config = statusConfigs[status];
    return (
      <span
        className={`
          inline-flex items-center gap-1.5 rounded-full border font-bold select-none
          ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'}
          ${config.style}
          ${className}
        `}
      >
        <span className="shrink-0">{config.icon}</span>
        <span>{children || config.label}</span>
      </span>
    );
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-bold select-none
        ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'}
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />}
      <span>{children}</span>
    </span>
  );
};
