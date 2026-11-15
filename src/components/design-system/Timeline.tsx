import React from 'react';
import { Clock, CheckCircle2, AlertCircle, PlayCircle, Lock } from 'lucide-react';

export interface TimelineEvent {
  id: string;
  time: string;
  title: string;
  category?: string;
  location?: string;
  status?: 'completed' | 'live' | 'upcoming' | 'delayed' | 'locked' | 'success' | 'primary' | 'warning';
  notes?: string;
  description?: string;
  badge?: string;
}

export type TimelineItem = TimelineEvent;

export interface TimelineProps {
  events?: TimelineEvent[];
  items?: TimelineEvent[];
  className?: string;
}

const statusIcons: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />,
  success: <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />,
  live: <PlayCircle className="w-4 h-4 text-[var(--accent)] animate-pulse" />,
  primary: <PlayCircle className="w-4 h-4 text-[var(--primary)]" />,
  upcoming: <Clock className="w-4 h-4 text-[var(--ink-2)]" />,
  delayed: <AlertCircle className="w-4 h-4 text-[var(--warning)]" />,
  warning: <AlertCircle className="w-4 h-4 text-[var(--warning)]" />,
  locked: <Lock className="w-4 h-4 text-[var(--ink-3)]" />,
};

const statusDotBg: Record<string, string> = {
  completed: 'bg-[var(--success)]',
  success: 'bg-[var(--success)]',
  live: 'bg-[var(--accent)] ring-4 ring-[var(--accent-soft)]',
  primary: 'bg-[var(--primary)] ring-4 ring-[var(--primary-soft)]',
  upcoming: 'bg-[var(--border)]',
  delayed: 'bg-[var(--warning)] ring-4 ring-amber-100 dark:ring-amber-950',
  warning: 'bg-[var(--warning)] ring-4 ring-amber-100 dark:ring-amber-950',
  locked: 'bg-[var(--ink-3)]',
};

export const Timeline: React.FC<TimelineProps> = ({ events, items, className = '' }) => {
  const list = items || events || [];
  return (
    <div className={`relative pr-6 space-y-6 text-right w-full ${className}`} dir="rtl">
      {/* Central vertical connecting line */}
      <div className="absolute right-2.5 top-2 bottom-2 w-[2px] bg-[var(--border)]" />

      {list.map((event) => {
        const status = event.status || 'upcoming';
        const noteText = event.description || event.notes;

        return (
          <div key={event.id} className="relative flex items-start gap-4 group">
            {/* Dot on line */}
            <div
              className={`absolute right-[-18px] top-1.5 w-3 h-3 rounded-full border-2 border-[var(--surface)] transition-all ${statusDotBg[status]}`}
            />

            {/* Event Content Card */}
            <div className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-3.5 shadow-[var(--shadow-1)] hover:border-[var(--primary)] transition-all">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  {statusIcons[status]}
                  <span className="text-xs font-mono font-bold text-[var(--primary)] bg-[var(--primary-soft)] px-2 py-0.5 rounded-[var(--radius-sm)]">
                    {event.time}
                  </span>
                  {event.category && (
                    <span className="text-[11px] font-bold text-[var(--ink-2)] bg-[var(--surface-2)] px-2 py-0.5 rounded-[var(--radius-sm)] border border-[var(--border)]">
                      {event.category}
                    </span>
                  )}
                </div>

                {event.badge && (
                  <span className="text-[10px] font-bold text-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-[var(--radius-sm)]">
                    {event.badge}
                  </span>
                )}
                {event.location && (
                  <span className="text-[11px] text-[var(--ink-3)]">{event.location}</span>
                )}
              </div>

              <h4 className="text-sm font-bold text-[var(--ink)]">{event.title}</h4>

              {noteText && (
                <p className="text-xs text-[var(--ink-2)] mt-1 leading-relaxed">{noteText}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
