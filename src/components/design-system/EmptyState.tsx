import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`bg-[var(--surface)] text-[var(--ink)] p-8 text-center space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] shadow-[var(--shadow-1)] ${className}`}
      dir="rtl"
    >
      {icon && (
        <div className="w-14 h-14 mx-auto rounded-[var(--radius-md)] bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center text-2xl">
          {icon}
        </div>
      )}
      <div className="space-y-1.5 max-w-sm mx-auto">
        <h3 className="text-sm font-bold text-[var(--ink)]">{title}</h3>
        {description && <p className="text-xs text-[var(--ink-2)] leading-relaxed">{description}</p>}
      </div>
      {actionLabel && onAction && (
        <div className="pt-2">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
