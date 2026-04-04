'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flow, Node } from '@/types/database';
import { formatDuration } from '@/lib/hooks/useTaskTimer';

function getEfficiencyLabel(score: number): string {
  if (score >= 100) return 'Ahead of Estimate';
  if (score >= 85) return 'On Pace';
  return 'Below Estimate';
}

function getEfficiencyColor(label: string): string {
  if (label === 'Ahead of Estimate') return 'text-emerald-400';
  if (label === 'On Pace') return 'text-blue-400';
  return 'text-amber-400';
}


export default function CompletionPage({
  params,
}: {
  params: { flowId: string };
}) {
  const router = useRouter();
  const { flowId } = params;

  const [flow, setFlow] = useState<Flow | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/flows/${flowId}`);
        const data = await res.json();
        if (res.ok) {
          setFlow(data.flow);
          setNodes(data.nodes ?? []);
        }
      } catch {
        // silent
      } finally {
        setIsLoading(false);
        // Staggered entry animation
        setTimeout(() => setMounted(true), 80);
      }
    })();
  }, [flowId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0E17] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-blue-400 font-mono text-xs tracking-widest uppercase">
            Loading completion data...
          </span>
        </div>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="min-h-screen bg-[#0A0E17] flex items-center justify-center text-gray-400">
        Flow not found.
      </div>
    );
  }

  // ─── Metric derivation (truthful) ───
  const completedNodes = nodes.filter((n) => n.status === 'completed');
  const totalTasks = nodes.length;
  const completedCount = completedNodes.length;

  // Actual time: sum of accumulated_duration_ms across all completed nodes
  const totalActualMs = completedNodes.reduce(
    (sum, n) => sum + (n.accumulated_duration_ms || 0),
    0
  );

  // Estimated time: sum of estimated_duration_ms across all nodes
  const totalEstimatedMs = nodes.reduce(
    (sum, n) => sum + (n.estimated_duration_ms || 0),
    0
  );

  // Efficiency: estimated / actual × 100. Can exceed 100 if faster than estimate.
  const efficiencyScore =
    totalActualMs > 0 && totalEstimatedMs > 0
      ? Math.round((totalEstimatedMs / totalActualMs) * 100)
      : null;

  const efficiencyLabel = efficiencyScore !== null ? getEfficiencyLabel(efficiencyScore) : null;
  const efficiencyColorClass = efficiencyLabel ? getEfficiencyColor(efficiencyLabel) : 'text-gray-400';

  // Time saved: only when efficiency is above 100 (user was faster than estimate)
  const timeSavedMs =
    efficiencyScore !== null && efficiencyScore > 100 && totalEstimatedMs > 0 && totalActualMs > 0
      ? totalEstimatedMs - totalActualMs
      : null;

  const completionDate = flow.completed_at
    ? new Date(flow.completed_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

  return (
    <div className="min-h-screen bg-[#0A0E17] text-gray-100 overflow-y-auto">
      {/* ─── Minimal top bar (no sidebar, no dashboard nav) ─── */}
      <header className="h-[64px] w-full flex items-center px-6 border-b border-[#1E293B] bg-[#0A0E17] sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-white text-sm shadow-[0_0_12px_rgba(59,130,246,0.4)]">
            P
          </div>
          <span className="font-bold text-sm text-white tracking-widest">PODDESK</span>
        </div>
      </header>

      {/* ─── Main content with staggered entry animation ─── */}
      <div
        className={`max-w-3xl mx-auto px-6 py-16 transition-all duration-700 ease-out ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        {/* Completion badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold tracking-[0.2em] text-emerald-400 uppercase">
              Flow Complete
            </span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-3 tracking-tight leading-tight">
          {flow.title}
        </h1>
        <p className="text-gray-500 text-center mb-14 text-sm">
          Completed {completionDate}
        </p>

        {/* ─── Progress + Efficiency card grid ─── */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          {/* Progress / completion card */}
          <div className="md:col-span-3 bg-[#121A2F] border border-[#1E293B] rounded-2xl p-8">
            <p className="text-[11px] font-bold tracking-[0.2em] text-gray-500 uppercase mb-6">
              Execution Progress
            </p>

            <div className="flex items-end justify-between mb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-6xl font-bold text-white">100</span>
                <span className="text-2xl text-gray-500">%</span>
              </div>
              <span className="text-sm text-gray-400 mb-2">
                {completedCount} of {totalTasks} tasks
              </span>
            </div>
            {/* Progress bar at 100% */}
            <div className="w-full h-2 bg-[#1E293B] rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: mounted ? '100%' : '0%' }}
              />
            </div>
          </div>

          {/* Efficiency score */}
          <div className="md:col-span-2 bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl p-8 flex flex-col justify-between">
            <p className="text-[11px] font-bold tracking-[0.2em] text-blue-200 uppercase mb-4">
              Efficiency Score
            </p>
            {efficiencyScore !== null ? (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-6xl font-bold text-white">{efficiencyScore}</span>
                  <span className="text-2xl text-blue-200">%</span>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <span className="inline-flex px-3 py-1 rounded-md text-xs font-semibold bg-white/20 text-white self-start">
                    {efficiencyLabel}
                  </span>
                  {/* Time saved — only when faster than estimate */}
                  {timeSavedMs !== null && timeSavedMs > 0 && (
                    <span className="text-xs text-blue-200 flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12,6 12,12 16,14" />
                      </svg>
                      −{formatDuration(timeSavedMs)}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div>
                <span className="text-2xl font-bold text-white/60">—</span>
                <p className="text-xs text-blue-200 mt-2">Timing data not available</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Stat row ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
          {[
            {
              label: 'Tasks Completed',
              value: `${completedCount}`,
              sub: `of ${totalTasks}`,
            },
            {
              label: 'Total Time',
              value: totalActualMs > 0 ? formatDuration(totalActualMs) : '—',
              sub: totalEstimatedMs > 0 ? `est. ${formatDuration(totalEstimatedMs)}` : '',
            },
            {
              label: 'Efficiency',
              value: efficiencyScore !== null ? `${efficiencyScore}%` : '—',
              sub: efficiencyLabel ?? '',
              subClass: efficiencyColorClass,
            },
            {
              label: 'Completed',
              value: completionDate.split(' ')[0] + ' ' + completionDate.split(' ')[1],
              sub: completionDate.split(' ')[2],
            },
          ].map(({ label, value, sub, subClass }) => (
            <div key={label} className="bg-[#121A2F] border border-[#1E293B] rounded-xl p-6">
              <p className="text-[10px] font-bold tracking-[0.18em] text-gray-500 uppercase mb-3">
                {label}
              </p>
              <p className="text-2xl font-bold text-white">{value}</p>
              {sub && (
                <p className={`text-xs mt-1 ${subClass ?? 'text-gray-500'}`}>{sub}</p>
              )}
            </div>
          ))}
        </div>

        {/* ─── CTAs ─── */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-16">
          <button
            onClick={() => router.push('/brain-dump')}
            className="px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors text-sm flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Start New Flow
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-7 py-3.5 bg-[#1E293B] hover:bg-[#283548] border border-[#334155] text-white font-medium rounded-xl transition-colors text-sm flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            View Dashboard
          </button>
          {/* Certificate — visible but coming soon for MVP */}
          <button
            disabled
            title="Certificate download coming soon"
            className="px-7 py-3.5 bg-[#0A0E17] border border-[#1E293B] text-gray-600 font-medium rounded-xl cursor-not-allowed text-sm flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="6" />
              <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
            </svg>
            Download Certificate
            <span className="text-[10px] bg-[#1E293B] px-1.5 py-0.5 rounded text-gray-500 font-mono">SOON</span>
          </button>
        </div>
      </div>
    </div>
  );
}
