'use client';

import React from 'react';

interface ExitWarningModalProps {
  flowTitle: string;
  completedCount: number;
  totalCount: number;
  onStayFocused: () => void;
  onLeave: () => void;
  isLeaving: boolean;
}

export function ExitWarningModal({
  flowTitle,
  completedCount,
  totalCount,
  onStayFocused,
  onLeave,
  isLeaving,
}: ExitWarningModalProps) {
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onStayFocused}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-[#121A2F] border border-[#2D3F5F]/60 rounded-2xl p-8 shadow-2xl shadow-black/40 animate-in fade-in zoom-in-95 duration-300">
        {/* Warning icon */}
        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-white text-center mb-3">
          Leaving mid-execution
        </h2>

        <p className="text-sm text-gray-400 text-center leading-relaxed mb-6">
          You&apos;re {progressPercent}% through <span className="text-gray-300 font-medium">{flowTitle}</span>.
          Your progress will be saved, but momentum is hard to rebuild.
        </p>

        {/* Progress indicator */}
        <div className="bg-[#0A0E17] rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-500">Progress</span>
            <span className="text-xs text-gray-400 font-mono">{completedCount}/{totalCount} tasks</span>
          </div>
          <div className="w-full h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={onStayFocused}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20 active:scale-[0.98]"
          >
            Stay Focused
          </button>
          <button
            onClick={onLeave}
            disabled={isLeaving}
            className="w-full py-3 bg-transparent hover:bg-[#1E293B]/50 text-gray-400 hover:text-gray-300 font-medium rounded-xl transition-all duration-200 border border-[#1E293B] disabled:opacity-50"
          >
            {isLeaving ? 'Saving progress...' : 'Leave Session'}
          </button>
        </div>
      </div>
    </div>
  );
}
