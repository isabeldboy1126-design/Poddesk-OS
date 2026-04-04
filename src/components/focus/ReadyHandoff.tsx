'use client';

import React, { useEffect, useState } from 'react';

interface ReadyHandoffProps {
  flowTitle: string;
  taskCount: number;
  onReady: () => void;
}

export function ReadyHandoff({
  flowTitle,
  taskCount,
  onReady,
}: ReadyHandoffProps) {
  const [phase, setPhase] = useState<'entering' | 'ready' | 'exit'>('entering');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('ready'), 300);
    const t2 = setTimeout(() => setPhase('exit'), 1200);
    const t3 = setTimeout(() => onReady(), 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onReady]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0E17]">
      <div
        className={`text-center transition-all duration-700 ${
          phase === 'entering'
            ? 'opacity-0 scale-95'
            : phase === 'exit'
            ? 'opacity-0 scale-105'
            : 'opacity-100 scale-100'
        }`}
      >
        {/* Pulsing focus ring */}
        <div className="relative w-16 h-16 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
          <div className="relative w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/40 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
          </div>
        </div>

        <p className="text-xs font-bold tracking-[0.3em] text-blue-400 uppercase mb-3 animate-in fade-in duration-500">
          Entering Focus Mode
        </p>
        <h1 className="text-2xl font-bold text-white mb-2">{flowTitle}</h1>
        <p className="text-sm text-gray-500">
          {taskCount} task{taskCount !== 1 ? 's' : ''} queued for execution
        </p>
      </div>
    </div>
  );
}
