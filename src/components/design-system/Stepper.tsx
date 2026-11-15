import React from 'react';
import { Check } from 'lucide-react';

export interface StepItem {
  id?: string | number;
  title: string;
  description?: string;
}

export interface StepperProps {
  steps: StepItem[];
  activeStep?: number; // 0-based index
  currentStep?: number; // Alias for activeStep
  onStepClick?: (stepIndex: number) => void;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  activeStep = 0,
  currentStep,
  onStepClick,
  className = '',
  orientation = 'horizontal',
}) => {
  const current = currentStep !== undefined ? currentStep : activeStep;
  return (
    <div
      className={`w-full ${orientation === 'vertical' ? 'flex flex-col space-y-4' : 'flex items-center justify-between gap-2'} ${className}`}
      dir="rtl"
    >
      {steps.map((step, idx) => {
        const isCompleted = idx < current;
        const isCurrent = idx === current;
        const isClickable = Boolean(onStepClick);

        return (
          <React.Fragment key={step.id ?? idx}>
            <div
              onClick={() => isClickable && onStepClick && onStepClick(idx)}
              className={`flex items-center gap-3 transition-colors ${
                isClickable ? 'cursor-pointer hover:opacity-80' : ''
              }`}
            >
              {/* Step Circle Indicator */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border transition-all ${
                  isCompleted
                    ? 'bg-[var(--success)] text-white border-[var(--success)]'
                    : isCurrent
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-[var(--shadow-1)] ring-4 ring-[var(--primary-soft)]'
                    : 'bg-[var(--surface-2)] text-[var(--ink-3)] border-[var(--border)]'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4 stroke-[2.5]" /> : idx + 1}
              </div>

              {/* Step Labels */}
              <div className="text-right select-none">
                <div
                  className={`text-xs font-bold ${
                    isCurrent
                      ? 'text-[var(--primary)]'
                      : isCompleted
                      ? 'text-[var(--ink)]'
                      : 'text-[var(--ink-3)]'
                  }`}
                >
                  {step.title}
                </div>
                {step.description && (
                  <div className="text-[10px] text-[var(--ink-2)] line-clamp-1">{step.description}</div>
                )}
              </div>
            </div>

            {/* Divider Line between steps */}
            {orientation === 'horizontal' && idx < steps.length - 1 && (
              <div
                className={`flex-1 h-[2px] mx-2 rounded-full transition-colors ${
                  idx < current ? 'bg-[var(--success)]' : 'bg-[var(--border)]'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
