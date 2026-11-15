import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      icon,
      trailingIcon,
      className = '',
      containerClassName = '',
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.replace(/\s+/g, '-')}` : undefined);

    return (
      <div className={`space-y-1 text-right w-full ${containerClassName}`} dir="rtl">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-bold text-[var(--ink)]">
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {icon && (
            <div className="absolute right-3 text-[var(--ink-3)] pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            className={`
              w-full min-h-[40px] py-2 px-3 text-sm bg-[var(--surface,#FFFFFF)] text-[var(--ink,#0A0A0A)]
              placeholder:text-[var(--ink-3,#7C7C77)] border-[1.5px] border-[var(--border,#DADAD6)] rounded-[var(--radius-sm,2px)]
              focus:outline-none focus:border-[var(--border-strong,#0A0A0A)] focus:ring-2 focus:ring-[var(--accent,#E5321B)]
              transition-all duration-150
              ${icon ? 'pr-9' : ''}
              ${trailingIcon ? 'pl-9' : ''}
              ${error ? 'border-[var(--danger,#B3261E)] focus:border-[var(--danger,#B3261E)] focus:ring-red-200' : ''}
              ${disabled ? 'opacity-50 cursor-not-allowed bg-[var(--surface-alt,#F3F3F1)]' : ''}
              ${className}
            `}
            {...props}
          />

          {trailingIcon && (
            <div className="absolute left-3 text-[var(--ink-3)] flex items-center justify-center">
              {trailingIcon}
            </div>
          )}
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

Input.displayName = 'Input';
