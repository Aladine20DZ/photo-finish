/**
 * PHOTO FINISH PRO — Athletic Visual Hero Graphics
 * High-contrast, vector-styled athletic scenes matching Panels 1-5 in the reference design.
 * Rendered natively for offline reliability, sharpness, and high-performance field usage.
 */

import React from 'react';

export type AthleticSceneType = 'sprint_start' | 'long_jump' | 'high_jump' | 'track_finish' | 'stadium_panorama';

interface AthleticVisualHeroProps {
  scene: AthleticSceneType;
  title?: string;
  badgeText?: string;
  className?: string;
}

export const AthleticVisualHero: React.FC<AthleticVisualHeroProps> = ({
  scene,
  title,
  badgeText,
  className = ''
}) => {
  return (
    <div className={`relative rounded-2xl overflow-hidden border border-[#1E293B] shadow-2xl bg-[#0A101D] select-none ${className}`}>
      {/* Dynamic Visual Composition based on Scene */}
      {scene === 'sprint_start' && (
        <div className="w-full h-full min-h-[160px] relative flex items-center justify-center overflow-hidden bg-gradient-to-l from-[#0E172A] via-[#101D35] to-[#1E3A8A]">
          <svg className="w-full h-full opacity-85 object-cover" viewBox="0 0 600 340" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="trackGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#E5321B" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#991B1B" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="glowGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#1677E8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#13A879" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            {/* Track perspective lanes */}
            <path d="M0,340 L180,180 L230,180 L80,340 Z" fill="url(#trackGrad)" />
            <path d="M85,340 L235,180 L285,180 L170,340 Z" fill="url(#trackGrad)" opacity="0.9" />
            <path d="M175,340 L290,180 L340,180 L260,340 Z" fill="url(#trackGrad)" opacity="0.8" />
            <line x1="80" y1="340" x2="230" y2="180" stroke="#FFFFFF" strokeWidth="3" opacity="0.8" />
            <line x1="170" y1="340" x2="285" y2="180" stroke="#FFFFFF" strokeWidth="3" opacity="0.8" />
            <line x1="260" y1="340" x2="340" y2="180" stroke="#FFFFFF" strokeWidth="3" opacity="0.8" />
            {/* Sprinter in starting blocks silhouette */}
            <g transform="translate(140, 150) scale(0.65)" fill="#FFFFFF">
              <circle cx="160" cy="50" r="14" fill="#60A5FA" />
              <path d="M150,68 C140,78 120,95 105,115 L125,125 C135,108 148,95 158,85 L180,115 L215,95 L200,80 L175,95 Z" />
              <path d="M130,120 L95,150 L60,140 L50,155 L90,165 L120,135 Z" fill="#93C5FD" />
              <path d="M165,110 L195,155 L245,175 L240,190 L180,168 L150,120 Z" />
            </g>
          </svg>
        </div>
      )}

      {scene === 'long_jump' && (
        <div className="w-full h-full min-h-[220px] relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#101D35] via-[#0E172A] to-[#1E293B]">
          <svg className="w-full h-full opacity-90 object-cover" viewBox="0 0 500 400" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="sandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D97706" />
                <stop offset="100%" stopColor="#92400E" />
              </linearGradient>
            </defs>
            {/* Sand Pit */}
            <rect x="0" y="260" width="500" height="140" fill="url(#sandGrad)" />
            <ellipse cx="250" cy="275" rx="180" ry="25" fill="#B45309" opacity="0.6" />
            {/* Sand splash droplets */}
            <circle cx="210" cy="250" r="4" fill="#FDE68A" />
            <circle cx="230" cy="240" r="5" fill="#FCD34D" />
            <circle cx="270" cy="245" r="3" fill="#FDE68A" />
            <circle cx="310" cy="255" r="4" fill="#FCD34D" />
            {/* Long Jumper Flight Silhouette */}
            <g transform="translate(170, 70) scale(0.75)" fill="#FFFFFF">
              <circle cx="120" cy="30" r="16" fill="#60A5FA" />
              <path d="M110,48 L80,95 L115,105 L135,65 Z" />
              <path d="M125,55 L165,85 L200,75 L210,90 L165,105 L120,70 Z" fill="#93C5FD" />
              <path d="M90,95 L50,140 L40,180 L60,185 L70,150 L105,115 Z" />
              <path d="M115,100 L135,155 L165,190 L180,180 L155,145 L130,105 Z" fill="#93C5FD" />
            </g>
          </svg>
        </div>
      )}

      {scene === 'high_jump' && (
        <div className="w-full h-full min-h-[220px] relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#101D35] via-[#0E172A] to-[#1E293B]">
          <svg className="w-full h-full opacity-90 object-cover" viewBox="0 0 500 400" preserveAspectRatio="xMidYMid slice">
            {/* Uprights & Crossbar */}
            <line x1="80" y1="60" x2="80" y2="350" stroke="#94A3B8" strokeWidth="8" />
            <line x1="420" y1="60" x2="420" y2="350" stroke="#94A3B8" strokeWidth="8" />
            <line x1="70" y1="130" x2="430" y2="130" stroke="#EF4444" strokeWidth="5" />
            {/* Landing Mat */}
            <rect x="60" y="270" width="380" height="90" rx="8" fill="#1E3A8A" stroke="#3B82F6" strokeWidth="2" />
            {/* High Jumper Fosbury Flop Silhouette */}
            <g transform="translate(130, 60) scale(0.7)" fill="#FFFFFF">
              <path d="M50,90 C80,30 180,20 220,75 L205,88 C175,45 95,50 70,100 Z" fill="#60A5FA" />
              <circle cx="235" cy="85" r="14" fill="#93C5FD" />
              {/* Back arched */}
              <path d="M70,95 C110,65 160,65 195,95 L180,110 C150,85 110,85 85,110 Z" />
              <path d="M50,90 L20,135 L5,125 L30,85 Z" fill="#93C5FD" />
              <path d="M40,95 L10,145 L25,155 L55,105 Z" />
            </g>
          </svg>
        </div>
      )}

      {scene === 'track_finish' && (
        <div className="w-full h-full min-h-[220px] relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#101D35] via-[#0E172A] to-[#1E293B]">
          <svg className="w-full h-full opacity-90 object-cover" viewBox="0 0 500 400" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="finishGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#DC2626" />
                <stop offset="100%" stopColor="#991B1B" />
              </linearGradient>
            </defs>
            {/* Track lanes */}
            <rect x="0" y="200" width="500" height="200" fill="url(#finishGrad)" />
            <line x1="0" y1="240" x2="500" y2="240" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="8 8" opacity="0.8" />
            <line x1="0" y1="290" x2="500" y2="290" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="8 8" opacity="0.8" />
            <line x1="0" y1="340" x2="500" y2="340" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="8 8" opacity="0.8" />
            {/* White Finish Line Bar */}
            <line x1="280" y1="200" x2="280" y2="400" stroke="#FFFFFF" strokeWidth="8" />
            {/* Sprinters Dashing */}
            <g transform="translate(180, 110) scale(0.65)" fill="#FFFFFF">
              {/* Sprinter 1 Lead */}
              <circle cx="150" cy="50" r="15" fill="#60A5FA" />
              <path d="M140,68 L115,120 L155,130 L170,80 Z" />
              <path d="M115,120 L80,185 L95,190 L135,130 Z" fill="#93C5FD" />
              <path d="M150,125 L190,195 L210,190 L165,125 Z" />
              {/* Sprinter 2 Chasing */}
              <circle cx="40" cy="70" r="14" fill="#34D399" />
              <path d="M30,86 L10,135 L45,145 L60,95 Z" opacity="0.85" />
            </g>
          </svg>
        </div>
      )}

      {scene === 'stadium_panorama' && (
        <div className="w-full h-full min-h-[160px] relative flex items-center justify-center overflow-hidden bg-gradient-to-r from-[#0E172A] via-[#101D35] to-[#047857]">
          <svg className="w-full h-full opacity-70 object-cover" viewBox="0 0 600 300" preserveAspectRatio="xMidYMid slice">
            {/* Stadium oval track */}
            <ellipse cx="300" cy="180" rx="260" ry="100" fill="#E5321B" stroke="#FFFFFF" strokeWidth="2" />
            <ellipse cx="300" cy="180" rx="230" ry="85" fill="#DC2626" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="6 6" />
            <ellipse cx="300" cy="180" rx="200" ry="70" fill="#15803D" />
            {/* Grandstand stands */}
            <path d="M50,90 Q300,10 550,90 L530,120 Q300,45 70,120 Z" fill="#334155" opacity="0.6" />
          </svg>
        </div>
      )}

      {/* Floating Badge Text e.g. "معاً.. لرياضة أقوى" */}
      {badgeText && (
        <div className="absolute bottom-3 right-3 z-10">
          <div className="px-3 py-1.5 rounded-xl bg-black/80 border border-white/20 text-white font-black text-xs shadow-lg flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#13A879] animate-pulse"></span>
            <span>{badgeText}</span>
          </div>
        </div>
      )}

      {title && (
        <div className="absolute top-3 right-3 z-10">
          <span className="px-2.5 py-1 rounded-lg bg-black/70 text-slate-300 text-[11px] font-bold">
            {title}
          </span>
        </div>
      )}
    </div>
  );
};
