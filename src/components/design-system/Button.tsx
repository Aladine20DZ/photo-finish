import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'touch' | 'icon';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end';
  children?: React.ReactNode;
}

const variantStyles = {
  primary:
    'bg-[var(--block,#0A0A0A)] hover:bg-[var(--block-2,#1C1C1A)] text-white font-black border border-[var(--block,#0A0A0A)] shadow-none',
  secondary:
    'bg-transparent hover:bg-[var(--surface-alt,#F3F3F1)] text-[var(--ink,#0A0A0A)] border-[1.5px] border-[var(--border-strong,#0A0A0A)] font-bold',
  accent:
    'bg-[var(--accent,#E5321B)] hover:bg-[var(--accent-hover,#C42A16)] text-white font-black border border-[var(--accent,#E5321B)] shadow-none',
  glass:
    'bg-[var(--surface-alt,#F3F3F1)] hover:bg-[#EAEAE6] text-[var(--ink,#0A0A0A)] border border-[var(--border,#DADAD6)] font-bold',
  danger:
    'bg-transparent hover:bg-red-50 text-[var(--danger,#B3261E)] border-[1.5px] border-[var(--danger,#B3261E)] font-bold',
  ghost:
    'bg-transparent hover:bg-[var(--surface-alt,#F3F3F1)] text-[var(--ink-2,#4A4A47)] hover:text-[var(--ink,#0A0A0A)] border border-transparent',
};

const sizeStyles = {
  sm: 'text-xs px-3 py-1.5 rounded-[var(--radius-sm,2px)] gap-1.5 min-h-[32px]',
  md: 'text-sm px-4 py-2 rounded-[var(--radius-sm,2px)] gap-2 min-h-[40px]',
  lg: 'text-base px-6 py-3 rounded-[var(--radius-sm,2px)] gap-2.5 font-bold min-h-[44px]',
  touch: 'text-base px-6 py-3.5 rounded-[var(--radius-sm,2px)] gap-2.5 font-black min-h-[52px] min-w-[52px] touch-manipulation',
  icon: 'p-2 rounded-[var(--radius-sm,2px)] min-h-[36px] min-w-[36px]',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'start',
  disabled,
  className = '',
  children,
  ...props
}) => {
  return (
    <motion.button
      whileHover={disabled || loading ? undefined : { y: -1, transition: { duration: 0.15 } }}
      whileTap={disabled || loading ? undefined : { scale: 0.98, transition: { duration: 0.1 } }}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-bold transition-all duration-150 cursor-pointer select-none
        disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        icon && iconPosition === 'start' && <span className="shrink-0">{icon}</span>
      )}
      {children && <span>{children}</span>}
      {!loading && icon && iconPosition === 'end' && <span className="shrink-0">{icon}</span>}
    </motion.button>
  );
};
