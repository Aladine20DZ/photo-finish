import React from 'react';
import { 
  FileEdit, 
  Send, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Lock 
} from 'lucide-react';

export type OperationStatusType = 
  | 'draft' 
  | 'sent' 
  | 'under_review' 
  | 'certified' 
  | 'rejected' 
  | 'locked';

export interface StatusPillProps {
  status: OperationStatusType | string;
  size?: 'sm' | 'md';
  className?: string;
  customLabel?: string;
}

const statusDefinitions: Record<OperationStatusType, { label: string; icon: React.ElementType; style: string }> = {
  draft: {
    label: 'مسودة',
    icon: FileEdit,
    style: 'bg-[var(--surface-alt,#F3F3F1)] text-[var(--ink-2,#4A4A47)] border border-[var(--border,#DADAD6)]',
  },
  sent: {
    label: 'مُرسَلة',
    icon: Send,
    style: 'bg-blue-50 text-[var(--info,#0B5CAD)] border border-blue-200 dark:bg-blue-950/40 dark:border-blue-900',
  },
  under_review: {
    label: 'قيد المراجعة',
    icon: Clock,
    style: 'bg-amber-50 text-[var(--warning,#B26A00)] border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900',
  },
  certified: {
    label: 'معتمدة',
    icon: CheckCircle2,
    style: 'bg-emerald-50 text-[var(--success,#0E7A3E)] border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900',
  },
  rejected: {
    label: 'مرفوضة',
    icon: XCircle,
    style: 'bg-red-50 text-[var(--danger,#B3261E)] border border-red-200 dark:bg-red-950/40 dark:border-red-900',
  },
  locked: {
    label: 'مقفلة',
    icon: Lock,
    style: 'bg-[var(--block,#0A0A0A)] text-white border border-[var(--border-strong,#0A0A0A)]',
  },
};

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  size = 'md',
  className = '',
  customLabel,
}) => {
  const normKey = (status in statusDefinitions ? status : 'draft') as OperationStatusType;
  const def = statusDefinitions[normKey];
  const Icon = def.icon;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  return (
    <span
      className={`
        inline-flex items-center font-bold rounded-[var(--radius-sm,2px)]
        select-none whitespace-nowrap
        ${def.style}
        ${sizeClasses[size]}
        ${className}
      `}
      dir="rtl"
    >
      <Icon className={`${iconSizes[size]} shrink-0`} />
      <span>{customLabel || def.label}</span>
    </span>
  );
};
