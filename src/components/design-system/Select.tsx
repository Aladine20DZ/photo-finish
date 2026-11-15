import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      error,
      helperText,
      icon,
      className = '',
      containerClassName = '',
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? `select-${label.replace(/\s+/g, '-')}` : undefined);

    return (
      <div className={`space-y-1 text-right w-full ${containerClassName}`} dir="rtl">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-bold text-[var(--ink)]">
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {icon && (
            <div className="absolute right-3 text-[var(--ink-3)] pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}

          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            className={`
              w-full min-h-[40px] py-2 px-3 text-sm bg-[var(--surface,#FFFFFF)] text-[var(--ink,#0A0A0A)]
              border-[1.5px] border-[var(--border,#DADAD6)] rounded-[var(--radius-sm,2px)] appearance-none cursor-pointer
              focus:outline-none focus:border-[var(--border-strong,#0A0A0A)] focus:ring-2 focus:ring-[var(--accent,#E5321B)]
              transition-all duration-150
              ${icon ? 'pr-9' : ''}
              pl-9
              ${error ? 'border-[var(--danger,#B3261E)] focus:border-[var(--danger,#B3261E)]' : ''}
              ${disabled ? 'opacity-50 cursor-not-allowed bg-[var(--surface-alt,#F3F3F1)]' : ''}
              ${className}
            `}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-[var(--surface)] text-[var(--ink)]">
                {opt.label}
              </option>
            ))}
          </select>

          <div className="absolute left-3 text-[var(--ink-3)] pointer-events-none flex items-center justify-center">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        {error ? (
          <p className="text-[11px] font-bold text-[var(--danger)]">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-[var(--ink-2)]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
