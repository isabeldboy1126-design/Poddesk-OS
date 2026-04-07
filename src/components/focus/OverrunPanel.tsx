'use client';

import React from 'react';
import { useTaskTimer } from '@/lib/hooks/useTaskTimer';

interface OverrunPanelProps {
  accumulatedMs: number;
  lastResumedAt: string | null;
  estimatedMs: number;
  onGetUnstuck: () => void;
  onSkipForNow: () => void;
  onClose: () => void;
}

export function OverrunPanel({
  accumulatedMs,
  lastResumedAt,
  estimatedMs,
  onGetUnstuck,
  onSkipForNow,
  onClose,
}: OverrunPanelProps) {
  const { formattedTime, totalMs } = useTaskTimer({
    accumulatedMs,
    lastResumedAt,
    estimatedMs,
  });

  const overrunMs = Math.max(0, totalMs - estimatedMs);
  const overrunMinutes = Math.floor(overrunMs / 1000 / 60);
  const overrunSeconds = Math.floor((overrunMs / 1000) % 60);
  const overrunFormatted = `+${overrunMinutes.toString().padStart(2, '0')}:${overrunSeconds.toString().padStart(2, '0')}`;
  const estimatedMinutes = Math.round(estimatedMs / 1000 / 60);

  return (
    <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#121A2F]/80 border border-[#2D3F5F]/50 rounded-2xl p-8 backdrop-blur-sm relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Close overrun panel"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header row */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <span className="text-amber-500 text-lg">⚠</span>
            <span className="text-xs font-bold tracking-[0.2em] text-amber-500 uppercase">
              Running Longer Than Expected
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-white tabular-nums">
              {formattedTime}
            </span>
            <span className="text-sm font-mono text-amber-500/80 tabular-nums">
              {overrunFormatted} overrun
            </span>
          </div>
        </div>

        {/* Main content */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-3">
            Are you feeling stuck?
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-md mx-auto">
            This task usually takes {estimatedMinutes} minutes. Sometimes a fresh
            perspective or a quick detour helps clear the blockage.
          </p>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={onGetUnstuck}
            className="flex items-center justify-center gap-2.5 py-3.5 bg-[#1E293B] hover:bg-[#283548] border border-[#334155] rounded-xl text-white font-medium transition-all duration-200 hover:border-blue-500/30"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Get unstuck
          </button>
          <button
            onClick={onSkipForNow}
            className="flex items-center justify-center gap-2.5 py-3.5 bg-[#1E293B] hover:bg-[#283548] border border-[#334155] rounded-xl text-white font-medium transition-all duration-200 hover:border-gray-500/30"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,4 15,12 5,20" />
              <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2" />
            </svg>
            Skip for now
          </button>
        </div>

        {/* Footer text */}
        <p className="text-center text-xs text-gray-600 tracking-wider uppercase">
          Adjust Duration for Similar Tasks
        </p>
      </div>

      {/* Bottom status bar */}
      <div className="flex items-center justify-center gap-6 mt-6">
        <span className="text-[10px] font-bold tracking-[0.2em] text-gray-600 uppercase">
          Execution Mode
        </span>
        <span className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">
          On Pace
        </span>
      </div>
      <p className="text-center text-[9px] text-gray-700 mt-2 tracking-wider">
        Designed for high-stakes professional operations
      </p>
    </div>
  );
}
