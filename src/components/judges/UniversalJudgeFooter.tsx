/**
 * PHOTO FINISH PRO — Universal Judge Field Footer Banner
 * Displayed across all Smart Judge Workspace screens matching the reference design.
 */

import React from 'react';
import { ShieldCheck, Zap, Wifi, Trophy } from 'lucide-react';

export const UniversalJudgeFooter: React.FC = () => {
  return (
    <footer 
      dir="rtl" 
      className="w-full bg-[#101D35] text-white border-t border-[#1E293B] px-4 py-3 shadow-2xl mt-8 rounded-2xl"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-bold">
        {/* Brand & System Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1677E8] flex items-center justify-center text-white shadow-md">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7z" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-black text-white tracking-wide">Photo Finish Pro</div>
            <div className="text-[11px] text-[#94A3B8] font-normal">Athletics Management System</div>
          </div>
        </div>

        {/* Feature Highlights Pills */}
        <div className="flex items-center flex-wrap gap-4 md:gap-6 text-slate-300">
          <div className="flex items-center gap-1.5 hover:text-white transition-colors">
            <ShieldCheck className="w-4 h-4 text-[#1677E8]" />
            <span>إدارة احترافية للمنافسات</span>
          </div>

          <div className="w-px h-4 bg-[#1E293B] hidden sm:block"></div>

          <div className="flex items-center gap-1.5 hover:text-white transition-colors">
            <Zap className="w-4 h-4 text-[#F59E0B]" />
            <span>سرعة فائقة في العمل الميداني</span>
          </div>

          <div className="w-px h-4 bg-[#1E293B] hidden sm:block"></div>

          <div className="flex items-center gap-1.5 hover:text-white transition-colors">
            <Wifi className="w-4 h-4 text-[#13A879]" />
            <span>دعم العمل دون إنترنت</span>
          </div>

          <div className="w-px h-4 bg-[#1E293B] hidden sm:block"></div>

          <div className="flex items-center gap-1.5 hover:text-white transition-colors">
            <Trophy className="w-4 h-4 text-[#1677E8]" />
            <span>إطلالة احترافية للمنافسات</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
