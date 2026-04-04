'use client';

import { useState, useEffect, useRef } from 'react';

interface UseTaskTimerOptions {
  /** Accumulated duration from the DB (milliseconds) */
  accumulatedMs: number;
  /** ISO timestamp of when the timer was last resumed (null = paused) */
  lastResumedAt: string | null;
  /** Estimated duration in milliseconds (for overrun detection) */
  estimatedMs: number | null;
  /** Overrun multiplier threshold (default 1.2x) */
  overrunThreshold?: number;
}

interface UseTaskTimerReturn {
  /** Total elapsed milliseconds (accumulated + live) */
  totalMs: number;
  /** Formatted time string HH:MM:SS */
  formattedTime: string;
  /** Whether the timer is currently running */
  isRunning: boolean;
  /** Whether estimated duration has been exceeded */
  isOverrun: boolean;
  /** Percentage of estimated time used (0-100+) */
  progressPercent: number;
  /** Estimated duration formatted */
  estimatedFormatted: string;
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
}

export function useTaskTimer({
  accumulatedMs,
  lastResumedAt,
  estimatedMs,
  overrunThreshold = 1.2,
}: UseTaskTimerOptions): UseTaskTimerReturn {
  const [liveElapsedMs, setLiveElapsedMs] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRunning = !!lastResumedAt;

  // Calculate initial live elapsed on mount or when lastResumedAt changes
  useEffect(() => {
    if (lastResumedAt) {
      const resumedTime = new Date(lastResumedAt).getTime();
      setLiveElapsedMs(Math.max(0, Date.now() - resumedTime));
    } else {
      setLiveElapsedMs(0);
    }
  }, [lastResumedAt]);

  // Tick every second while running
  useEffect(() => {
    if (isRunning && lastResumedAt) {
      const resumedTime = new Date(lastResumedAt).getTime();

      intervalRef.current = setInterval(() => {
        setLiveElapsedMs(Math.max(0, Date.now() - resumedTime));
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isRunning, lastResumedAt]);

  const totalMs = accumulatedMs + liveElapsedMs;

  const isOverrun = estimatedMs
    ? totalMs > estimatedMs * overrunThreshold
    : false;

  const progressPercent = estimatedMs
    ? Math.min(Math.round((totalMs / estimatedMs) * 100), 999)
    : 0;

  return {
    totalMs,
    formattedTime: formatMs(totalMs),
    isRunning,
    isOverrun,
    progressPercent,
    estimatedFormatted: estimatedMs ? formatMs(estimatedMs) : '--:--',
  };
}

/**
 * Utility: format ms to a human-readable duration string
 * e.g., "12m", "1h 30m", "45s"
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}
