import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'strong' | 'interactive' | 'outline' | 'surface-alt';
  radius?: 'sm' | 'md' | 'lg' | 'xl';
  accentBorder?: 'none' | 'top-black' | 'top-red' | 'right-red';
  className?: string;
  children: React.ReactNode;
}

const variantClasses = {
  default: 'bg-[var(--surface,#FFFFFF)] text-[var(--ink,#0A0A0A)] border border-[var(--border,#DADAD6)] shadow-[var(--shadow-1,none)]',
  strong: 'bg-[var(--surface,#FFFFFF)] text-[var(--ink,#0A0A0A)] border-2 border-[var(--border-strong,#0A0A0A)] shadow-[var(--shadow-2)]',
  interactive: 'bg-[var(--surface,#FFFFFF)] text-[var(--ink,#0A0A0A)] border border-[var(--border,#DADAD6)] hover:border-[var(--border-strong,#0A0A0A)] hover:bg-[var(--surface-alt,#F3F3F1)] cursor-pointer transition-colors duration-150',
  outline: 'bg-transparent text-[var(--ink,#0A0A0A)] border border-[var(--border,#DADAD6)]',
  'surface-alt': 'bg-[var(--surface-alt,#F3F3F1)] text-[var(--ink,#0A0A0A)] border border-[var(--border,#DADAD6)]',
};

const radiusClasses = {
  sm: 'rounded-[var(--radius-sm,2px)]',
  md: 'rounded-[var(--radius-md,4px)]',
  lg: 'rounded-[var(--radius-lg,6px)]',
  xl: 'rounded-[var(--radius-lg,6px)]',
};

const accentBorderClasses = {
  none: '',
  'top-black': 'border-t-[3px] border-t-[var(--block,#0A0A0A)]',
  'top-red': 'border-t-[3px] border-t-[var(--accent,#E5321B)]',
  'right-red': 'border-r-4 border-r-[var(--accent,#E5321B)]',
};

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  radius = 'md',
  accentBorder = 'none',
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`
        ${variantClasses[variant]}
        ${radiusClasses[radius]}
        ${accentBorderClasses[accentBorder]}
        relative overflow-hidden transition-all duration-150
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};
