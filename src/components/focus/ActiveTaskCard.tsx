'use client';

import React from 'react';
import { Node } from '@/types/database';

interface ActiveTaskCardProps {
  node: Node;
  totalNodes: number;
  completedCount: number;
  breadcrumb?: string | null;
  onMarkComplete: () => void;
  onPause: () => void;
  onExplainStep: () => void;
  isCompleting: boolean;
  explanation: string | null;
  isLoadingExplanation: boolean;
  showExplanation: boolean;
  onToggleExplanation: () => void;
}

export function ActiveTaskCard({
  node,
  totalNodes,
  completedCount,
  breadcrumb,
  onMarkComplete,
  onPause,
  onExplainStep,
  isCompleting,
  explanation,
  isLoadingExplanation,
  showExplanation,
  onToggleExplanation,
}: ActiveTaskCardProps) {
  const handleExplainClick = () => {
    if (!showExplanation && !explanation) {
      onExplainStep();
    }
    onToggleExplanation();
  };

  const currentStep = completedCount + 1;
  const progressPercent = Math.round((completedCount / totalNodes) * 100);

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Step indicator + Progress */}
      <div className="mb-6">
        <span className="text-xs font-bold tracking-[0.2em] text-gray-500 uppercase">
          Step {currentStep} of {totalNodes}
        </span>
        <h1 className="text-3xl font-bold text-white mt-2 mb-4 leading-tight">
          {node.title}
        </h1>
        {/* Progress bar */}
        <div className="w-48 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Task detail card */}
      <div className="bg-[#121A2F]/60 border border-[#1E293B] rounded-xl p-1 mb-8">
        {/* Sub-items / task details */}
        <div className="space-y-0">
          {breadcrumb && (
            <div className="px-5 py-4 rounded-lg border border-blue-400/30 bg-blue-500/10">
              <p className="text-[10px] font-bold tracking-[0.16em] text-blue-300 uppercase mb-1">
                Restart Point
              </p>
              <p className="text-sm text-blue-100 leading-relaxed">{breadcrumb}</p>
            </div>
          )}

          {/* Description row */}
          {node.description && (
            <div className="flex items-center gap-4 px-5 py-4 rounded-lg">
              <div className="w-6 h-6 rounded-full border-2 border-[#334155] flex-shrink-0" />
              <span className="text-sm text-gray-300 flex-1">{node.description}</span>
              <div className="flex flex-col gap-0.5 opacity-30">
                <span className="w-1 h-1 bg-gray-500 rounded-full" />
                <span className="w-1 h-1 bg-gray-500 rounded-full" />
                <span className="w-1 h-1 bg-gray-500 rounded-full" />
                <span className="w-1 h-1 bg-gray-500 rounded-full" />
                <span className="w-1 h-1 bg-gray-500 rounded-full" />
                <span className="w-1 h-1 bg-gray-500 rounded-full" />
              </div>
            </div>
          )}

          {/* Done definition row */}
          {node.done_definition && (
            <div className="flex items-center gap-4 px-5 py-4 rounded-lg">
              <div className="w-6 h-6 rounded-full border-2 border-[#334155] flex-shrink-0" />
              <span className="text-sm text-gray-300 flex-1">{node.done_definition}</span>
              <div className="flex flex-col gap-0.5 opacity-30">
                <span className="w-1 h-1 bg-gray-500 rounded-full" />
                <span className="w-1 h-1 bg-gray-500 rounded-full" />
                <span className="w-1 h-1 bg-gray-500 rounded-full" />
                <span className="w-1 h-1 bg-gray-500 rounded-full" />
                <span className="w-1 h-1 bg-gray-500 rounded-full" />
                <span className="w-1 h-1 bg-gray-500 rounded-full" />
              </div>
            </div>
          )}

          {/* Active task indicator row */}
          <div className="flex items-center gap-4 px-5 py-4 bg-[#1E2943]/50 rounded-lg border border-[#2D3F5F]/50">
            <div className="w-6 h-6 rounded-full border-2 border-blue-500 bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            </div>
            <span className="text-sm text-white flex-1 font-medium">
              {node.milestone ? `${node.milestone}` : 'Complete this task to advance'}
            </span>
            <button
              onClick={handleExplainClick}
              className="text-gray-400 hover:text-blue-400 transition-colors p-1"
              title="Explain this step"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Explanation panel (inline expandable) */}
      {showExplanation && (
        <div className="mb-8 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Left: step context */}
            <div className="md:col-span-3 bg-[#1E2943]/40 border border-[#2D3F5F]/30 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-white">Step {currentStep}: {node.title}</span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                {isLoadingExplanation
                  ? 'Generating explanation...'
                  : explanation || node.description || 'No additional context available.'}
              </p>
            </div>
            {/* Right: the why / tips */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-sm font-semibold text-white">The Why</span>
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Done Definition</p>
                <p className="text-sm text-gray-400 italic leading-relaxed">
                  &ldquo;{node.done_definition || 'Complete the task objective fully.'}&rdquo;
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Quick Tips</p>
                <ul className="space-y-1.5">
                  <li className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Start with the smallest verifiable action
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Focus only on this task
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Don&apos;t expand scope
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPause}
          className="flex items-center gap-2 text-sm font-bold tracking-[0.15em] text-gray-400 hover:text-white transition-colors uppercase"
        >
          <span className="flex gap-0.5">
            <span className="w-1 h-4 bg-current rounded-sm" />
            <span className="w-1 h-4 bg-current rounded-sm" />
          </span>
          Pause Session
        </button>

        <button
          onClick={onMarkComplete}
          disabled={isCompleting}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.98]"
        >
          {isCompleting ? 'Completing...' : 'Mark Complete'}
        </button>
      </div>
    </div>
  );
}
