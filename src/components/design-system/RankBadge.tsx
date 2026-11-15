import React from 'react';

export interface RankBadgeProps {
  rank: number | string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
  showPodiumColor?: boolean;
}

export const RankBadge: React.FC<RankBadgeProps> = ({
  rank,
  size = 'md',
  className = '',
  showPodiumColor = true,
}) => {
  const numericRank = typeof rank === 'number' ? rank : parseInt(String(rank), 10);

  // Podium styling (Gold, Silver, Bronze) with number always visible
  let podiumStyle = 'bg-[var(--block,#0A0A0A)] text-white border border-[var(--border-strong,#0A0A0A)]';

  if (showPodiumColor && !isNaN(numericRank)) {
    if (numericRank === 1) {
      // Gold (subtle matte gold)
      podiumStyle = 'bg-[#C5A059] text-[#0A0A0A] font-black border border-[#A8843E]';
    } else if (numericRank === 2) {
      // Silver (subtle matte silver)
      podiumStyle = 'bg-[#D1D5DB] text-[#0A0A0A] font-black border border-[#9CA3AF]';
    } else if (numericRank === 3) {
      // Bronze (subtle matte bronze)
      podiumStyle = 'bg-[#B0774D] text-white font-black border border-[#8C5A34]';
    }
  }

  const sizeClasses = {
    sm: 'w-5 h-5 text-xs',
    md: 'w-7 h-7 text-sm',
    lg: 'w-9 h-9 text-base',
    hero: 'w-14 h-14 text-2xl',
  };

  return (
    <div
      className={`
        inline-flex items-center justify-center font-athletic font-black tabular-nums
        rounded-[var(--radius-sm,2px)] shrink-0 select-none tracking-tight
        ${sizeClasses[size]}
        ${podiumStyle}
        ${className}
      `}
      title={`المرتبة ${rank}`}
    >
      {rank}
    </div>
  );
};
