import React, { useState } from 'react';
import { Tabs, TabItem } from './Tabs';

export interface SplitLayoutProps {
  primaryTitle?: string;
  primaryContent: React.ReactNode;
  secondaryTitle?: string;
  secondaryContent: React.ReactNode;
  primarySpan?: number; // out of 12 (default 8)
  secondarySpan?: number; // out of 12 (default 4)
  className?: string;
}

export const SplitLayout: React.FC<SplitLayoutProps> = ({
  primaryTitle = 'القسم الرئيسي',
  primaryContent,
  secondaryTitle = 'التفاصيل والمعاينة',
  secondaryContent,
  primarySpan = 8,
  secondarySpan = 4,
  className = '',
}) => {
  const [mobileTab, setMobileTab] = useState<'primary' | 'secondary'>('primary');

  const mobileTabs: TabItem[] = [
    { id: 'primary', label: primaryTitle },
    { id: 'secondary', label: secondaryTitle },
  ];

  return (
    <div className={`space-y-4 w-full ${className}`} dir="rtl">
      {/* Mobile Tab Switcher */}
      <div className="block lg:hidden">
        <Tabs tabs={mobileTabs} activeTab={mobileTab} onChange={(id) => setMobileTab(id as any)} />
      </div>

      {/* Desktop Grid Layout */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-6 items-start">
        <div style={{ gridColumn: `span ${primarySpan} / span ${primarySpan}` }}>
          {primaryContent}
        </div>
        <div style={{ gridColumn: `span ${secondarySpan} / span ${secondarySpan}` }}>
          {secondaryContent}
        </div>
      </div>

      {/* Mobile Visible Panel */}
      <div className="block lg:hidden">
        {mobileTab === 'primary' ? primaryContent : secondaryContent}
      </div>
    </div>
  );
};
