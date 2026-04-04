'use client';

import React, { useEffect, useState } from 'react';

interface CompletionTransitionProps {
  /** Milestone name if applicable */
  milestone: string | null;
  /** Current completed count (after this completion) */
  completedCount: number;
  /** Total task count */
  totalCount: number;
  /** Whether this was the final task */
  isFinal: boolean;
  /** Called when the transition animation finishes */
  onTransitionEnd: () => void;
}

export function CompletionTransition({
  milestone,
  completedCount,
  totalCount,
  isFinal,
  onTransitionEnd,
}: CompletionTransitionProps) {
  const [phase, setPhase] = useState<'check' | 'message' | 'exit'>('check');

  useEffect(() => {
    // Phase 1: checkmark (0-400ms)
    const t1 = setTimeout(() => setPhase('message'), 400);
    // Phase 2: message (400-1100ms)
    const t2 = setTimeout(() => setPhase('exit'), 1100);
    // Phase 3: exit (1100-1400ms)
    const t3 = setTimeout(() => onTransitionEnd(), 1400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onTransitionEnd]);

  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0E17]/90 backdrop-blur-sm">
      <div
        className={`text-center transition-all duration-500 ${
          phase === 'exit' ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        {/* Checkmark animation */}
        <div
          className={`mx-auto mb-6 transition-all duration-500 ${
            phase === 'check'
              ? 'scale-100 opacity-100'
              : 'scale-90 opacity-70'
          }`}
        >
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto animate-in zoom-in duration-300">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#10B981"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-in fade-in duration-300"
            >
              <polyline points="20,6 9,17 4,12" />
            </svg>
          </div>
        </div>

        {/* Progress message */}
        <div
          className={`transition-all duration-500 ${
            phase === 'message' || phase === 'exit'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          {isFinal ? (
            <>
              <h2 className="text-2xl font-bold text-white mb-2">
                Mission Complete
              </h2>
              <p className="text-gray-400 text-sm">
                All {totalCount} tasks finished. Exceptional execution.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-white mb-1">
                {milestone ? `${milestone}` : 'Task Complete'}
              </h2>
              <p className="text-gray-400 text-sm mb-4">
                {completedCount} of {totalCount} • {progressPercent}%
              </p>
              {/* Mini progress bar */}
              <div className="w-48 h-1 bg-[#1E293B] rounded-full overflow-hidden mx-auto">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
