'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { HubContainer } from '@/components/layout/HubContainer';
import { Flow, Node } from '@/types/database';
import { formatDuration } from '@/lib/hooks/useTaskTimer';

// ─── Flow enriched with its nodes ───
interface EnrichedFlow extends Flow {
  nodes: Node[];
}

// ─── Classification ───
function classifyFlow(flow: EnrichedFlow): 'review' | 'active' | 'completed' | 'abandoned' | 'other' {
  if (flow.status === 'completed') return 'completed';
  if (flow.status === 'review') return 'review';
  if (flow.status === 'active') return 'active';
  if (flow.status === 'abandoned') return 'abandoned';
  return 'other';
}

// ─── Per-flow metric helpers ───
function deriveFlowProgress(flow: EnrichedFlow): number {
  const total = flow.nodes.length;
  if (total === 0) return 0;
  const completed = flow.nodes.filter((n) => n.status === 'completed').length;
  return Math.round((completed / total) * 100);
}

function deriveFlowEfficiency(flow: EnrichedFlow): number | null {
  const completedNodes = flow.nodes.filter((n) => n.status === 'completed');
  const totalActual = completedNodes.reduce((s, n) => s + (n.accumulated_duration_ms || 0), 0);
  const totalEstimated = flow.nodes.reduce((s, n) => s + (n.estimated_duration_ms || 0), 0);
  if (totalActual === 0 || totalEstimated === 0) return null;
  return Math.round((totalEstimated / totalActual) * 100);
}

function getEfficiencyLabel(score: number): string {
  if (score >= 100) return 'Ahead of Estimate';
  if (score >= 85) return 'On Pace';
  return 'Below Estimate';
}

function getEfficiencyLabelColor(label: string): string {
  if (label === 'Ahead of Estimate') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (label === 'On Pace') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
}

function deriveFlowActualMs(flow: EnrichedFlow): number {
  return flow.nodes
    .filter((n) => n.status === 'completed')
    .reduce((s, n) => s + (n.accumulated_duration_ms || 0), 0);
}

function deriveCurrentMilestone(flow: EnrichedFlow): string | null {
  const active = flow.nodes.find((n) => n.status === 'active');
  return active?.milestone ?? null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Delete confirmation modal ───
function DeleteModal({
  flowTitle,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  flowTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#121A2F] border border-[#1E293B] rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-2">Delete flow?</h3>
        <p className="text-gray-400 text-sm mb-6">
          <span className="text-gray-200 font-medium">{flowTitle}</span> will be permanently removed. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 bg-[#1E293B] hover:bg-[#283548] text-gray-300 rounded-xl text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium transition-colors"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Active / Review flow card ───
function ActiveFlowCard({
  flow,
  onDelete,
}: {
  flow: EnrichedFlow;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const classification = classifyFlow(flow);
  const progress = deriveFlowProgress(flow);
  const milestone = deriveCurrentMilestone(flow);
  const actualMs = deriveFlowActualMs(flow);
  const lastActivity = flow.updated_at;

  const isReview = classification === 'review';

  return (
    <div className="bg-[#121A2F] border border-[#1E293B] rounded-2xl p-6 hover:border-[#334155] transition-colors group flex flex-col justify-between">
      <div>
        <div className="flex items-start mb-6">
          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 mr-3 flex-shrink-0 ${isReview ? 'bg-blue-500' : 'bg-blue-500'}`} />
          <h3 className="text-xl font-bold text-white line-clamp-2 leading-snug">
            {flow.title}
          </h3>
        </div>

        {/* Labeled stat row : STATUS / MILESTONE / ACTIVITY */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase block mb-1">STATUS</span>
            {isReview ? (
              <span className="text-sm text-gray-300">Review ready</span>
            ) : (
              <span className="text-sm text-gray-300">{progress}% complete</span>
            )}
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase block mb-1">CURRENT MILESTONE</span>
            <span className="text-sm text-gray-300">{milestone ?? '—'}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase block mb-1">ACTIVITY</span>
            <span className="text-sm text-gray-300">
              {actualMs > 0 ? formatDuration(actualMs) : `Last active ${timeAgo(lastActivity)}`}
            </span>
          </div>
        </div>

        {/* Progress bar — only for active flows */}
        {!isReview && (
          <div className="mb-6">
            <div className="w-full h-1 bg-[#1E293B] rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 mt-2">
        {isReview ? (
          <>
            <button
              onClick={() => router.push(`/flow/${flow.id}/review`)}
              className="px-6 py-2.5 bg-[#1E293B] hover:bg-[#283548] border border-[#334155] text-gray-300 text-sm font-medium rounded-lg transition-colors"
            >
              Review
            </button>
            <button
              onClick={() => router.push(`/flow/${flow.id}/focus`)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Begin
            </button>
          </>
        ) : (
          <button
            onClick={() => router.push(`/flow/${flow.id}/focus`)}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Resume
          </button>
        )}
        <button
          onClick={() => onDelete(flow.id)}
          className="text-gray-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-500/10 flex-shrink-0 ml-1"
          title="Delete flow"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3,6 5,6 21,6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Completed flow table row ───
function CompletedFlowRow({ flow }: { flow: EnrichedFlow }) {
  const router = useRouter();
  const efficiency = deriveFlowEfficiency(flow);
  const efficiencyLabel = efficiency !== null ? getEfficiencyLabel(efficiency) : null;
  const actualMs = deriveFlowActualMs(flow);
  const completedCount = flow.nodes.filter((n) => n.status === 'completed').length;

  return (
    <tr className="border-b border-[#1E293B] last:border-b-0 hover:bg-[#1E293B]/30 transition-colors">
      {/* Flow Name */}
      <td className="py-4 pl-6 pr-4">
        <p className="text-sm font-medium text-white line-clamp-1">
          {flow.title}
        </p>
        <p className="text-[10px] text-gray-600 mt-0.5">
          {formatDate(flow.completed_at)} • {completedCount} tasks
        </p>
      </td>
      {/* Efficiency */}
      <td className="py-4 px-4 text-center">
        {efficiency !== null ? (
          <div>
            <p className="text-sm font-semibold text-white">{efficiency}%</p>
            <p className="text-[10px] text-gray-500">{efficiencyLabel}</p>
          </div>
        ) : (
          <span className="text-sm text-gray-600">—</span>
        )}
      </td>
      {/* Duration */}
      <td className="py-4 px-4 text-center">
        <span className="text-sm text-gray-300">
          {actualMs > 0 ? formatDuration(actualMs) : '—'}
        </span>
      </td>
      {/* Timeline (efficiency label badge) */}
      <td className="py-4 px-4 text-center">
        {efficiencyLabel !== null ? (
          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border ${getEfficiencyLabelColor(efficiencyLabel)}`}>
            {efficiencyLabel.toUpperCase()}
          </span>
        ) : (
          <span className="text-xs text-gray-600">—</span>
        )}
      </td>
      {/* Action */}
      <td className="py-4 pl-4 pr-6 text-right">
        <button
          onClick={() => router.push(`/flow/${flow.id}/completion`)}
          className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors inline-flex items-center gap-1"
        >
          View Certificate
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12,5 19,12 12,19" />
          </svg>
        </button>
      </td>
    </tr>
  );
}

// ─── KPI card ───
function KpiCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-[#121A2F] border border-[#1E293B] rounded-2xl p-6 relative overflow-hidden">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-bold tracking-[0.18em] text-gray-500 uppercase mb-3">{label}</p>
        {icon && (
          <div className="text-gray-700 flex-shrink-0">{icon}</div>
        )}
      </div>
      <p className={`text-3xl font-bold ${accent ?? 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Main Dashboard ───
export default function DashboardPage() {
  const router = useRouter();

  const [flows, setFlows] = useState<EnrichedFlow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedFlow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFlows = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/flows');
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to load flows');
      }
      const data = await res.json();
      setFlows(data.flows ?? []);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlows();
  }, [fetchFlows]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/flows/${deleteTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'abandon' }),
      });
      setFlows((prev) => prev.filter((f) => f.id !== deleteTarget.id));
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ─── Flow classification ───
  // Active + review = visible in Active Flows section
  // Completed = visible in Completed Flows section
  // Abandoned = excluded from display sections, kept for KPI derivation
  const activeFlows = flows.filter((f) => classifyFlow(f) === 'active' || classifyFlow(f) === 'review');
  const completedFlows = flows.filter((f) => classifyFlow(f) === 'completed');
  const abandonedFlows = flows.filter((f) => classifyFlow(f) === 'abandoned');

  // ─── KPI derivation ───

  // Completion rate: completed / locked × 100
  // "locked" = flows that entered execution: active + completed + abandoned
  const lockedFlows = [...activeFlows.filter((f) => f.status === 'active'), ...completedFlows, ...abandonedFlows];
  const completionRate =
    lockedFlows.length > 0
      ? Math.round((completedFlows.length / lockedFlows.length) * 100)
      : null;

  // Focus time: sum of all actual ms across completed nodes in all flows
  const totalFocusMs = flows.reduce((sum, f) => {
    return sum + f.nodes
      .filter((n) => n.status === 'completed')
      .reduce((s, n) => s + (n.accumulated_duration_ms || 0), 0);
  }, 0);

  // Current efficiency: average across completed flows that have data
  const efficiencyScores = completedFlows
    .map((f) => deriveFlowEfficiency(f))
    .filter((s): s is number => s !== null);
  const avgEfficiency =
    efficiencyScores.length > 0
      ? Math.round(efficiencyScores.reduce((a, b) => a + b, 0) / efficiencyScores.length)
      : null;

  const hasFlows = flows.filter((f) => classifyFlow(f) !== 'abandoned' && classifyFlow(f) !== 'other').length > 0;

  return (
    <HubContainer>
      {deleteTarget && (
        <DeleteModal
          flowTitle={deleteTarget.title}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}

      {/* ─── Header with + New Flow ─── */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            Your work is in motion
          </h1>
          <p className="text-gray-400">
            Track active flows, review completed work, and return to execution with clarity.
          </p>
        </div>
        <button
          onClick={() => router.push('/brain-dump')}
          className="flex-shrink-0 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Flow
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-8 text-center">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <button
            onClick={fetchFlows}
            className="text-xs text-gray-400 hover:text-white underline transition-colors"
          >
            Retry
          </button>
        </div>
      ) : !hasFlows ? (
        /* ─── Empty state ─── */
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#121A2F] border border-[#1E293B] flex items-center justify-center mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">You haven&apos;t created any flows yet</h2>
          <p className="text-gray-500 text-sm mb-8 max-w-xs">
            Start by describing your work and Poddesk will generate a focused execution plan.
          </p>
          <button
            onClick={() => router.push('/brain-dump')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            Start Your First Flow
          </button>
        </div>
      ) : (
        <>
          {/* ─── KPI row ─── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <KpiCard
              label="Current Efficiency"
              value={avgEfficiency !== null ? `${avgEfficiency}%` : '—'}
              sub={avgEfficiency !== null ? undefined : 'No completed flows yet'}
              accent={avgEfficiency !== null && avgEfficiency >= 100 ? 'text-emerald-400' : undefined}
              icon={
                avgEfficiency !== null && avgEfficiency >= 100 ? (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">+{avgEfficiency - 100}%</span>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
                  </svg>
                )
              }
            />
            <KpiCard
              label="Completion Rate"
              value={completionRate !== null ? `${completionRate}%` : '—'}
              sub={`${completedFlows.length} of ${lockedFlows.length} flows`}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
                  <polyline points="17,6 23,6 23,12" />
                </svg>
              }
            />
            <KpiCard
              label="Focus Time"
              value={totalFocusMs > 0 ? formatDuration(totalFocusMs) : '—'}
              sub="total execution time"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12,6 12,12 16,14" />
                </svg>
              }
            />
            <KpiCard
              label="Active Flows"
              value={`${activeFlows.length}`}
              sub={activeFlows.length === 1 ? '1 in progress' : `${activeFlows.length} in progress`}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              }
            />
          </div>

          {/* ─── Active + Review flows ─── */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">
                Active Flows
              </h2>
              <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">VIEW ALL</span>
            </div>
            {activeFlows.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeFlows.map((flow) => (
                  <ActiveFlowCard
                    key={flow.id}
                    flow={flow}
                    onDelete={(id) => setDeleteTarget(flows.find((f) => f.id === id) ?? null)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 bg-[#121A2F]/50 border border-[#1E293B] border-dashed rounded-2xl">
                <p className="text-gray-500 text-sm mb-4">No active flows in progress.</p>
                <button
                  onClick={() => router.push('/brain-dump')}
                  className="px-6 py-2.5 bg-[#1E293B] hover:bg-[#283548] border border-[#334155] text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Start a New Flow
                </button>
              </div>
            )}
          </section>

          {/* ─── Completed flows table ─── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">
                Completed Flows
              </h2>
              <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">HISTORY</span>
            </div>
            {completedFlows.length > 0 ? (
              <div className="bg-[#121A2F] border border-[#1E293B] rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#1E293B]">
                      <th className="text-[10px] font-bold tracking-wider text-gray-600 uppercase py-4 pl-6 pr-4">Flow Name</th>
                      <th className="text-[10px] font-bold tracking-wider text-gray-600 uppercase py-4 px-4 text-center">Efficiency</th>
                      <th className="text-[10px] font-bold tracking-wider text-gray-600 uppercase py-4 px-4 text-center">Duration</th>
                      <th className="text-[10px] font-bold tracking-wider text-gray-600 uppercase py-4 px-4 text-center">Timeline</th>
                      <th className="text-[10px] font-bold tracking-wider text-gray-600 uppercase py-4 pl-4 pr-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="px-6">
                    {completedFlows.map((flow) => (
                      <CompletedFlowRow key={flow.id} flow={flow} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 bg-[#121A2F]/50 border border-[#1E293B] border-dashed rounded-2xl">
                <p className="text-gray-500 text-sm">You haven&apos;t completed any flows yet.</p>
              </div>
            )}
          </section>
        </>
      )}
    </HubContainer>
  );
}
