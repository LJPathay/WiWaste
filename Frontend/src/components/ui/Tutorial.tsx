import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, X, Lightbulb } from 'lucide-react';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface TutorialProps {
  steps: TutorialStep[];
  isOpen: boolean;
  onClose: () => void;
}

export function Tutorial({ steps, isOpen, onClose }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!isOpen || steps.length === 0) return;

    const updateHighlight = () => {
      const target = document.querySelector(steps[currentStep].targetSelector);
      if (target) {
        setHighlightRect(target.getBoundingClientRect());
      }
    };

    updateHighlight();
    window.addEventListener('resize', updateHighlight);
    return () => window.removeEventListener('resize', updateHighlight);
  }, [isOpen, currentStep, steps]);

  if (!isOpen || steps.length === 0) return null;

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const getTooltipPosition = () => {
    if (!highlightRect) return { top: 0, left: 0 };

    const padding = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 180;

    const position = step.position || 'bottom';

    switch (position) {
      case 'top':
        return {
          top: highlightRect.top - tooltipHeight - padding,
          left: highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2,
        };
      case 'left':
        return {
          top: highlightRect.top + highlightRect.height / 2 - tooltipHeight / 2,
          left: highlightRect.left - tooltipWidth - padding,
        };
      case 'right':
        return {
          top: highlightRect.top + highlightRect.height / 2 - tooltipHeight / 2,
          left: highlightRect.left + highlightRect.width + padding,
        };
      case 'bottom':
      default:
        return {
          top: highlightRect.top + highlightRect.height + padding,
          left: highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2,
        };
    }
  };

  const tooltipPos = getTooltipPosition();

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Highlight Box with Glow */}
      {highlightRect && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            top: highlightRect.top - 8,
            left: highlightRect.left - 8,
            width: highlightRect.width + 16,
            height: highlightRect.height + 16,
          }}
        >
          {/* Outer Glow */}
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 opacity-0 animate-pulse" />
          
          {/* Inner Glow Border */}
          <div className="absolute inset-0 rounded-lg border-2 border-blue-400 shadow-lg shadow-blue-400/50 animate-pulse" />
          
          {/* Animated Corner Accents */}
          <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-blue-400 rounded-tl animate-pulse" />
          <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-blue-400 rounded-tr animate-pulse" />
          <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-blue-400 rounded-bl animate-pulse" />
          <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-blue-400 rounded-br animate-pulse" />
        </div>
      )}

      {/* Tooltip */}
      <div
        className="fixed z-50 w-80 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-blue-400/50 shadow-2xl shadow-blue-500/20 p-5 animate-in fade-in slide-in-from-bottom-4 duration-300"
        style={{
          top: `${tooltipPos.top}px`,
          left: `${tooltipPos.left}px`,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/20 border border-blue-400/50">
              <Lightbulb className="h-4 w-4 text-blue-400 animate-pulse" />
            </div>
            <h3 className="text-sm font-bold text-white">{step.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-300 leading-relaxed mb-4">{step.description}</p>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-blue-400">
            {currentStep + 1}/{steps.length}
          </span>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={isFirst}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-600 hover:border-blue-400 text-slate-300 hover:text-blue-400 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Back</span>
          </button>

          {isLast ? (
            <button
              onClick={onClose}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-xs font-semibold transition-all shadow-lg shadow-blue-500/30"
            >
              <span>Got It!</span>
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-xs font-semibold transition-all shadow-lg shadow-blue-500/30"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Keyboard Hint */}
        <p className="text-[10px] text-slate-500 mt-3 text-center">
          💡 Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono text-[9px]">Esc</kbd> to exit
        </p>
      </div>
    </>
  );
}
