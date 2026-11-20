/**
 * PHOTO FINISH PRO AI — Fast Field ScorePad
 * High-contrast, tactile keypad designed for outdoor stadium conditions.
 * Supports direct measurement input, fouls (X), passes (-), DNS, DNF, and wind reading.
 * World Athletics Rule 25 Compliant.
 */

import React, { useState, useEffect } from 'react';
import { X, Check, Delete, Wind, ArrowRight, User } from 'lucide-react';
import { FieldAttemptResult } from '../../types/athletics';

interface FieldScorePadProps {
  isOpen: boolean;
  athleteName: string;
  bibNumber: number;
  clubName: string;
  attemptNumber: number;
  totalAttempts?: number;
  existingValue?: string | number;
  existingResultType?: FieldAttemptResult;
  existingWind?: number;
  showWindInput?: boolean;
  unitLabel?: string;
  onSave: (data: {
    resultType: FieldAttemptResult;
    measurement: number;
    wind?: number;
  }) => void;
  onClose: () => void;
  onNextAthlete?: () => void;
}

export const FieldScorePad: React.FC<FieldScorePadProps> = ({
  isOpen,
  athleteName,
  bibNumber,
  clubName,
  attemptNumber,
  totalAttempts = 6,
  existingValue = '',
  existingResultType = 'valid',
  existingWind = 0.0,
  showWindInput = false,
  unitLabel = 'متر',
  onSave,
  onClose,
  onNextAthlete
}) => {
  const [resultType, setResultType] = useState<FieldAttemptResult>(existingResultType);
  const [measurementStr, setMeasurementStr] = useState<string>(
    existingValue && existingValue !== 0 && existingValue !== 'X' && existingValue !== '-' ? String(existingValue) : ''
  );
  const [windStr, setWindStr] = useState<string>(existingWind ? String(existingWind) : '0.0');

  useEffect(() => {
    if (isOpen) {
      setResultType(existingResultType);
      setMeasurementStr(
        existingValue && existingValue !== 0 && existingValue !== 'X' && existingValue !== '-' ? String(existingValue) : ''
      );
      setWindStr(existingWind !== undefined ? String(existingWind) : '0.0');
    }
  }, [isOpen, existingValue, existingResultType, existingWind]);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    setResultType('valid');
    if (digit === '.') {
      if (!measurementStr.includes('.')) {
        setMeasurementStr(prev => (prev === '' ? '0.' : prev + '.'));
      }
      return;
    }
    // Limit to 2 decimal places e.g. 8.25
    if (measurementStr.includes('.')) {
      const parts = measurementStr.split('.');
      if (parts[1]?.length >= 2) return;
    }
    setMeasurementStr(prev => prev + digit);
  };

  const handleBackspace = () => {
    setMeasurementStr(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setMeasurementStr('');
    setResultType('valid');
  };

  const handleActionType = (type: FieldAttemptResult) => {
    setResultType(type);
    if (type === 'foul') setMeasurementStr('X');
    else if (type === 'pass') setMeasurementStr('-');
    else if (type === 'dns') setMeasurementStr('DNS');
    else if (type === 'dnf') setMeasurementStr('DNF');
  };

  const handleSubmit = (advanceNext: boolean = false) => {
    let meas = 0;
    if (resultType === 'valid') {
      meas = parseFloat(measurementStr);
      if (isNaN(meas) || meas <= 0) {
        alert('يرجى إدخال قياس صالح بالأمتار (مثال: 7.85 أو 18.20) أو اختيار حالة المحاولة.');
        return;
      }
    }

    const windVal = showWindInput ? parseFloat(windStr) || 0 : undefined;
    onSave({
      resultType,
      measurement: meas,
      wind: windVal
    });

    if (advanceNext && onNextAthlete) {
      onNextAthlete();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80">
      <div 
        dir="rtl"
        className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header: Athlete & Attempt Info */}
        <div className="bg-slate-800/90 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 font-black text-lg font-mono">
              #{bibNumber}
            </span>
            <div>
              <div className="text-base font-black text-white">{athleteName}</div>
              <div className="text-xs text-slate-400">{clubName} • المحاولة ({attemptNumber} من {totalAttempts})</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Display Box */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-col items-center justify-center min-h-[90px]">
          <div className="text-xs text-slate-400 mb-1 font-bold">
            {resultType === 'valid' ? `القياس المسجل (${unitLabel})` : 'حالة المحاولة'}
          </div>
          <div className="text-4xl font-black font-mono tracking-wider flex items-baseline gap-2">
            <span className={
              resultType === 'valid' ? 'text-emerald-400' :
              resultType === 'foul' ? 'text-red-400' :
              resultType === 'pass' ? 'text-amber-400' : 'text-slate-400'
            }>
              {resultType === 'valid' ? (measurementStr || '0.00') : measurementStr}
            </span>
            {resultType === 'valid' && measurementStr && (
              <span className="text-base font-normal text-slate-500">م</span>
            )}
          </div>

          {/* Wind gauge input for horizontal jumps */}
          {showWindInput && resultType === 'valid' && (
            <div className="mt-2 flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-xs">
              <Wind className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">الرياح:</span>
              <input
                type="number"
                step="0.1"
                value={windStr}
                onChange={(e) => setWindStr(e.target.value)}
                className="w-16 bg-transparent text-center font-mono font-bold text-cyan-300 focus:outline-none"
                placeholder="0.0"
              />
              <span className="text-slate-500">م/ثا</span>
            </div>
          )}
        </div>

        {/* Fast Action Buttons: Foul, Pass, DNS, DNF */}
        <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/90 border-b border-slate-800">
          <button
            type="button"
            onClick={() => handleActionType('foul')}
            className={`py-2.5 px-1 rounded-xl text-xs font-black transition-all border flex flex-col items-center justify-center gap-0.5 ${
              resultType === 'foul'
                ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-950/50'
                : 'bg-red-950/40 text-red-300 border-red-900/50 hover:bg-red-900/60'
            }`}
          >
            <span className="text-base font-mono">X</span>
            <span>خطأ</span>
          </button>

          <button
            type="button"
            onClick={() => handleActionType('pass')}
            className={`py-2.5 px-1 rounded-xl text-xs font-black transition-all border flex flex-col items-center justify-center gap-0.5 ${
              resultType === 'pass'
                ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-950/50'
                : 'bg-amber-950/40 text-amber-300 border-amber-900/50 hover:bg-amber-900/60'
            }`}
          >
            <span className="text-base font-mono">—</span>
            <span>تنازل</span>
          </button>

          <button
            type="button"
            onClick={() => handleActionType('dns')}
            className={`py-2.5 px-1 rounded-xl text-xs font-black transition-all border flex flex-col items-center justify-center gap-0.5 ${
              resultType === 'dns'
                ? 'bg-slate-600 text-white border-slate-500 shadow-lg'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <span className="text-xs font-mono font-black">DNS</span>
            <span>غياب</span>
          </button>

          <button
            type="button"
            onClick={() => handleActionType('dnf')}
            className={`py-2.5 px-1 rounded-xl text-xs font-black transition-all border flex flex-col items-center justify-center gap-0.5 ${
              resultType === 'dnf'
                ? 'bg-purple-600 text-white border-purple-500 shadow-lg'
                : 'bg-purple-950/40 text-purple-300 border-purple-900/50 hover:bg-purple-900/60'
            }`}
          >
            <span className="text-xs font-mono font-black">DNF</span>
            <span>انسحاب</span>
          </button>
        </div>

        {/* Large Tactile Numeric Keypad */}
        <div className="p-4 grid grid-cols-3 gap-2.5 bg-slate-900">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-2xl font-black font-mono text-white active:scale-95 transition-all shadow-sm flex items-center justify-center"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={() => handleDigit('.')}
            className="h-14 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-2xl font-black font-mono text-amber-400 active:scale-95 transition-all flex items-center justify-center"
          >
            .
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-2xl font-black font-mono text-white active:scale-95 transition-all flex items-center justify-center"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 active:scale-95 transition-all flex items-center justify-center"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {/* Action Controls: Save & Save/Next */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            className="flex-1 py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-98 transition-all shadow-lg shadow-emerald-950/40"
          >
            <Check className="w-5 h-5" />
            <span>حفظ المحاولة</span>
          </button>

          {onNextAthlete && (
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              className="py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              title="حفظ والانتقال للعداء التالي"
            >
              <span>حفظ والتالي</span>
              <ArrowRight className="w-4 h-4 rotate-180" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
