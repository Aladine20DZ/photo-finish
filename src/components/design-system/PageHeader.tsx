import React from 'react';

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  action?: React.ReactNode;
  showTrackHatch?: boolean;
  hatch?: boolean;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  actions,
  action,
  showTrackHatch = false,
  hatch = false,
  className = '',
}) => {
  const renderedActions = actions || action;
  const hasHatch = showTrackHatch || hatch;

  return (
    <div
      className={`
        bg-[var(--block,#0A0A0A)] text-white relative overflow-hidden
        border-b-[3px] border-[var(--accent,#E5321B)]
        ${hasHatch ? 'track-hatch' : ''}
        ${className}
      `}
      dir="rtl"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            {eyebrow && (
              <p className="text-[11px] font-black uppercase tracking-widest text-[#A3A39E]">
                {eyebrow}
              </p>
            )}
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-[#DADAD6] max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>

          {renderedActions && (
            <div className="flex items-center gap-2.5 shrink-0">
              {renderedActions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
