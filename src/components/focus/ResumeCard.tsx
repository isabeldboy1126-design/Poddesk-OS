'use client';

import React from 'react';
import { Flow, Node } from '@/types/database';
import { formatDuration } from '@/lib/hooks/useTaskTimer';

interface ResumeCardProps {
  flow: Flow;
  activeNode: Node;
  remainingCount: number;
  totalElapsedMs: number;
  breadcrumb?: string | null;
  onResume: () => void;
  isResuming: boolean;
}

export function ResumeCard({
  flow,
  activeNode,
  remainingCount,
  totalElapsedMs,
  breadcrumb,
  onResume,
  isResuming,
}: ResumeCardProps) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center relative">
      {/* Background network pattern effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.06]">
          <svg viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="300" cy="300" r="200" stroke="#3B82F6" strokeWidth="0.5" />
            <circle cx="300" cy="300" r="150" stroke="#3B82F6" strokeWidth="0.3" />
            <circle cx="300" cy="300" r="250" stroke="#3B82F6" strokeWidth="0.3" />
            <line x1="100" y1="200" x2="500" y2="400" stroke="#3B82F6" strokeWidth="0.3" />
            <line x1="200" y1="100" x2="400" y2="500" stroke="#3B82F6" strokeWidth="0.3" />
            <line x1="150" y1="350" x2="450" y2="250" stroke="#3B82F6" strokeWidth="0.3" />
            {/* Nodes */}
            <circle cx="150" cy="200" r="3" fill="#3B82F6" opacity="0.5" />
            <circle cx="450" cy="400" r="3" fill="#3B82F6" opacity="0.5" />
            <circle cx="200" cy="100" r="2" fill="#3B82F6" opacity="0.4" />
            <circle cx="400" cy="500" r="2" fill="#3B82F6" opacity="0.4" />
            <circle cx="350" cy="250" r="4" fill="#3B82F6" opacity="0.6" />
            <circle cx="250" cy="350" r="3" fill="#3B82F6" opacity="0.5" />
          </svg>
        </div>
      </div>

      {/* Resume card */}
      <div className="relative z-10 w-full max-w-md bg-[#1E2943]/80 backdrop-blur-sm border border-[#2D3F5F]/60 rounded-2xl p-8 text-center shadow-2xl shadow-black/30">
        <p className="text-xs font-bold tracking-[0.25em] text-gray-400 uppercase mb-3">
          Current Mission
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-8 leading-tight">
          {flow.title}
        </h1>

        {/* Stats row */}
        <div className="flex items-start justify-center gap-10 mb-8">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase mb-1">
              Elapsed
            </p>
            <p className="text-xl font-mono font-bold text-white tabular-nums">
              {formatDuration(totalElapsedMs)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase mb-1">
              Remaining
            </p>
            <p className="text-xl font-bold text-white">
              {remainingCount} Step{remainingCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {breadcrumb && (
          <div className="mb-6 rounded-xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-left">
            <p className="text-[10px] font-bold tracking-[0.16em] text-blue-300 uppercase mb-1">
              Exact Restart Point
            </p>
            <p className="text-sm text-blue-100 leading-relaxed">{breadcrumb}</p>
          </div>
        )}

        {/* Resume CTA */}
        <button
          onClick={onResume}
          disabled={isResuming}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.98] flex items-center justify-center gap-3"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
          {isResuming ? 'Resuming...' : 'Resume Focus'}
        </button>

        {/* Current task hint */}
        <p className="text-xs text-gray-500 mt-4">
          Next up: <span className="text-gray-400">{activeNode.title}</span>
        </p>
      </div>
    </div>
  );
}
