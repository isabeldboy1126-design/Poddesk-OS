'use client';

import React from 'react';
import { useTaskTimer } from '@/lib/hooks/useTaskTimer';

interface TaskTimerProps {
  accumulatedMs: number;
  lastResumedAt: string | null;
  estimatedMs: number | null;
}

export function TaskTimer({
  accumulatedMs,
  lastResumedAt,
  estimatedMs,
}: TaskTimerProps) {
  const { formattedTime, isRunning } = useTaskTimer({
    accumulatedMs,
    lastResumedAt,
    estimatedMs,
  });

  return (
    <div className="flex items-baseline gap-1">
      <span
        className={`text-4xl font-mono font-bold tracking-tight tabular-nums ${
          isRunning ? 'text-white' : 'text-gray-500'
        }`}
      >
        {formattedTime}
      </span>
      {isRunning && (
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse mb-1" />
      )}
    </div>
  );
}
