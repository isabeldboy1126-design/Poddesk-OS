'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Flow, Node } from '@/types/database';
import { FlowContainer } from '@/components/layout/FlowContainer';
import { ActiveTaskCard } from '@/components/focus/ActiveTaskCard';
import { TaskTimer } from '@/components/focus/TaskTimer';
import { ResumeCard } from '@/components/focus/ResumeCard';
import { OverrunPanel } from '@/components/focus/OverrunPanel';
import { ExitWarningModal } from '@/components/focus/ExitWarningModal';
import { CompletionTransition } from '@/components/focus/CompletionTransition';
import { ReadyHandoff } from '@/components/focus/ReadyHandoff';
import { useTaskTimer } from '@/lib/hooks/useTaskTimer';

type FocusState =
  | 'loading'
  | 'ready_handoff'
  | 'resume_reorientation'
  | 'active'
  | 'paused'
  | 'overrun'
  | 'completing'
  | 'exit_warning'
  | 'flow_complete'
  | 'error';

type UnstuckBlockType =
  | 'none'
  | 'dont_know_how_to_start'
  | 'waiting_on_something'
  | 'task_feels_too_big';

type UnstuckStage = 'closed' | 'choice' | 'context' | 'loading' | 'result';

interface UnstuckResponse {
  what_is_blocking_you: string;
  do_this_now: string;
  smallest_possible_step: string;
  avoid_this: string;
  done_looks_like: string;
}

export default function FocusPage({
  params,
}: {
  params: { flowId: string };
}) {
  const router = useRouter();
  const { flowId } = params;

  const [focusState, setFocusState] = useState<FocusState>('loading');
  const [flow, setFlow] = useState<Flow | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [unstuckStage, setUnstuckStage] = useState<UnstuckStage>('closed');
  const [unstuckBlockType, setUnstuckBlockType] = useState<UnstuckBlockType>('none');
  const [unstuckContext, setUnstuckContext] = useState('');
  const [unstuckResult, setUnstuckResult] = useState<UnstuckResponse | null>(null);
  const [unstuckError, setUnstuckError] = useState<string | null>(null);
  const [completionData, setCompletionData] = useState<{
    milestone: string | null;
    completedCount: number;
    totalCount: number;
    isFinal: boolean;
  } | null>(null);

  // Overrun detection tracking
  const overrunDismissedRef = useRef(false);

  // Derived state
  const activeNode = nodes.find((n) => n.status === 'active') || null;
  const completedNodes = nodes.filter((n) => n.status === 'completed');
  const completedCount = completedNodes.length;
  const remainingCount = nodes.length - completedCount;
  const isTimerPaused = activeNode ? !activeNode.last_resumed_at : true;

  // Total elapsed across all nodes
  const totalElapsedMs = nodes.reduce((sum, n) => {
    let nodeMs = n.accumulated_duration_ms || 0;
    if (n.status === 'active' && n.last_resumed_at) {
      nodeMs += Math.max(0, Date.now() - new Date(n.last_resumed_at).getTime());
    }
    return sum + nodeMs;
  }, 0);

  // Timer hook for overrun detection on active node
  const timer = useTaskTimer({
    accumulatedMs: activeNode?.accumulated_duration_ms || 0,
    lastResumedAt: activeNode?.last_resumed_at || null,
    estimatedMs: activeNode?.estimated_duration_ms || null,
  });

  // ─── Data Fetching ───
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/flows/${flowId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch flow');
      setFlow(data.flow);
      setNodes(data.nodes);
      return data;
    } catch (err: unknown) {
      setError((err as Error).message);
      setFocusState('error');
      return null;
    }
  }, [flowId]);

  // ─── Initial Load ───
  useEffect(() => {
    (async () => {
      const data = await fetchData();
      if (!data) return;

      const { flow: f, nodes: n } = data;
      const activeN = n.find((nd: Node) => nd.status === 'active');

      if (f.status === 'completed') {
        // Flow already done — redirect to completion
        router.replace(`/flow/${flowId}/completion`);
        return;
      }

      if (f.status === 'review') {
        // Fresh start — need to start execution
        setFocusState('ready_handoff');
      } else if (f.status === 'active' && activeN) {
        // Returning user
        if (activeN.last_resumed_at) {
          // Timer was running when they left (browser closed without pausing)
          setFocusState('active');
        } else {
          // Timer was paused — show resume reorientation
          setFocusState('resume_reorientation');
        }
      } else {
        // Edge case — active flow with no active node
        setFocusState('error');
        setError('Flow is in an unexpected state');
      }
    })();
  }, [fetchData, flowId, router]);

  // ─── Overrun Detection ───
  useEffect(() => {
    if (
      focusState === 'active' &&
      timer.isOverrun &&
      !overrunDismissedRef.current
    ) {
      setFocusState('overrun');
    }
  }, [focusState, timer.isOverrun]);

  // ─── Start Execution (fresh flow) ───
  const handleStartExecution = useCallback(async () => {
    try {
      const res = await fetch(`/api/flows/${flowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_execution' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start execution');

      await fetchData();
      setFocusState('active');
    } catch (err: unknown) {
      setError((err as Error).message);
      setFocusState('error');
    }
  }, [flowId, fetchData]);

  // ─── Pause ───
  const handlePause = useCallback(async () => {
    if (!activeNode) return;
    try {
      await fetch(`/api/flows/${flowId}/nodes/${activeNode.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
      });
      await fetchData();
      setFocusState('paused');
    } catch (err: unknown) {
      console.error('Pause failed:', err);
    }
  }, [activeNode, flowId, fetchData]);

  // ─── Resume ───
  const handleResume = useCallback(async () => {
    if (!activeNode) return;
    setIsResuming(true);
    try {
      await fetch(`/api/flows/${flowId}/nodes/${activeNode.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume' }),
      });
      await fetchData();
      overrunDismissedRef.current = false;
      setFocusState('active');
    } catch (err: unknown) {
      console.error('Resume failed:', err);
    } finally {
      setIsResuming(false);
    }
  }, [activeNode, flowId, fetchData]);

  // ─── Mark Complete ───
  const handleMarkComplete = useCallback(async () => {
    if (!activeNode || isCompleting) return;
    setIsCompleting(true);
    try {
      const res = await fetch(`/api/flows/${flowId}/nodes/${activeNode.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Complete failed');

      const newCompletedCount = completedCount + 1;

      setCompletionData({
        milestone: activeNode.milestone,
        completedCount: newCompletedCount,
        totalCount: nodes.length,
        isFinal: data.flow_completed,
      });
      setFocusState('completing');

      // Clear explanation for next task
      setExplanation(null);
      setShowExplanation(false);
      overrunDismissedRef.current = false;
    } catch (err: unknown) {
      console.error('Complete failed:', err);
      setError((err as Error).message);
    } finally {
      setIsCompleting(false);
    }
  }, [activeNode, isCompleting, flowId, completedCount, nodes.length]);

  // ─── Completion Transition End ───
  const handleCompletionTransitionEnd = useCallback(async () => {
    if (completionData?.isFinal) {
      router.push(`/flow/${flowId}/completion`);
    } else {
      await fetchData();
      setCompletionData(null);
      setFocusState('active');
    }
  }, [completionData, flowId, fetchData, router]);

  // ─── Explain Step ───
  const handleExplainStep = useCallback(async () => {
    if (!activeNode || isLoadingExplanation) return;
    setIsLoadingExplanation(true);
    try {
      const res = await fetch(`/api/flows/${flowId}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: activeNode.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setExplanation(data.explanation);
      }
    } catch (err: unknown) {
      console.error('Explain failed:', err);
    } finally {
      setIsLoadingExplanation(false);
    }
  }, [activeNode, flowId, isLoadingExplanation]);

  // Reset staged unstuck state when active task changes
  useEffect(() => {
    setUnstuckStage('closed');
    setUnstuckBlockType('none');
    setUnstuckContext('');
    setUnstuckResult(null);
    setUnstuckError(null);
  }, [activeNode?.id]);

  const closeUnstuck = useCallback(() => {
    setUnstuckStage('closed');
    setUnstuckBlockType('none');
    setUnstuckContext('');
    setUnstuckResult(null);
    setUnstuckError(null);
  }, []);

  const requestUnstuck = useCallback(async (
    blockType: UnstuckBlockType,
    contextText: string
  ) => {
    if (!activeNode) return;
    setUnstuckError(null);
    setUnstuckStage('loading');

    try {
      const res = await fetch(`/api/flows/${flowId}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'unstuck_v2',
          nodeId: activeNode.id,
          userBlockType: blockType,
          userContext: contextText.trim() || undefined,
        }),
      });

      const data = (await res.json()) as Partial<UnstuckResponse> & { error?: string; details?: string };

      if (!res.ok) {
        setUnstuckError('Get Unstuck is unavailable right now. Try again in a moment.');
        setUnstuckStage('choice');
        return;
      }

      const fields: Array<keyof UnstuckResponse> = [
        'what_is_blocking_you',
        'do_this_now',
        'smallest_possible_step',
        'avoid_this',
        'done_looks_like',
      ];

      const isValid = fields.every(
        (k) => typeof data[k] === 'string' && (data[k] as string).trim().length > 0
      );

      if (!isValid) {
        setUnstuckError('Get Unstuck is unavailable right now. Try again in a moment.');
        setUnstuckStage('choice');
        return;
      }

      setUnstuckResult({
        what_is_blocking_you: (data.what_is_blocking_you as string).trim(),
        do_this_now: (data.do_this_now as string).trim(),
        smallest_possible_step: (data.smallest_possible_step as string).trim(),
        avoid_this: (data.avoid_this as string).trim(),
        done_looks_like: (data.done_looks_like as string).trim(),
      });
      setUnstuckStage('result');
    } catch {
        setUnstuckError('Get Unstuck is unavailable right now. Try again in a moment.');
        setUnstuckStage('choice');
    }
  }, [activeNode, flowId]);

  // ─── Exit Warning ───
  const handleBackClick = () => {
    if (focusState === 'active' || focusState === 'overrun') {
      setFocusState('exit_warning');
    } else {
      router.push('/dashboard');
    }
  };

  const handleLeave = async () => {
    setIsLeaving(true);
    if (activeNode && !isTimerPaused) {
      await fetch(`/api/flows/${flowId}/nodes/${activeNode.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
      });
    }
    router.push('/dashboard');
  };

  // ─── Overrun actions ───
  const handleGetUnstuck = () => {
    overrunDismissedRef.current = true;
    setFocusState('active');
    setUnstuckStage('choice');
  };

  const handleSkipForNow = () => {
    overrunDismissedRef.current = true;
    handleMarkComplete();
  };

  const handleCloseOverrun = () => {
    overrunDismissedRef.current = true;
    setFocusState('active');
  };

  // ─── RENDER ───

  // Loading
  if (focusState === 'loading') {
    return (
      <FlowContainer showTopBar={false}>
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-blue-400 font-mono text-sm tracking-wider">
              LOADING EXECUTION STATE...
            </span>
          </div>
        </div>
      </FlowContainer>
    );
  }

  // Error
  if (focusState === 'error') {
    return (
      <FlowContainer backHref="/dashboard">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="bg-[#121A2F] border border-red-500/30 rounded-xl p-8 text-center max-w-md">
            <h2 className="text-xl font-bold text-red-400 mb-3">
              Execution Error
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              {error || 'Something went wrong loading this flow.'}
            </p>
            <button
              onClick={() => router.push('/brain-dump')}
              className="px-6 py-2 bg-[#1E293B] hover:bg-[#283548] text-white rounded-lg transition-colors text-sm"
            >
              Back to Start
            </button>
          </div>
        </div>
      </FlowContainer>
    );
  }

  // Ready handoff (fresh start)
  if (focusState === 'ready_handoff' && flow) {
    return (
      <ReadyHandoff
        flowTitle={flow.title}
        taskCount={nodes.length}
        onReady={handleStartExecution}
      />
    );
  }

  // Resume reorientation
  if (focusState === 'resume_reorientation' && flow && activeNode) {
    return (
      <FlowContainer backHref="/dashboard">
        <ResumeCard
          flow={flow}
          activeNode={activeNode}
          remainingCount={remainingCount}
          totalElapsedMs={totalElapsedMs}
          onResume={handleResume}
          isResuming={isResuming}
        />
      </FlowContainer>
    );
  }

  // Paused state — show resume card
  if (focusState === 'paused' && flow && activeNode) {
    return (
      <FlowContainer backHref="/dashboard">
        <ResumeCard
          flow={flow}
          activeNode={activeNode}
          remainingCount={remainingCount}
          totalElapsedMs={totalElapsedMs}
          onResume={handleResume}
          isResuming={isResuming}
        />
      </FlowContainer>
    );
  }

  // Overrun panel
  if (focusState === 'overrun' && activeNode) {
    return (
      <FlowContainer onBackClick={handleBackClick}>
        <div className="flex items-center justify-center min-h-[70vh]">
          <OverrunPanel
            accumulatedMs={activeNode.accumulated_duration_ms}
            lastResumedAt={activeNode.last_resumed_at}
            estimatedMs={activeNode.estimated_duration_ms || 0}
            onGetUnstuck={handleGetUnstuck}
            onSkipForNow={handleSkipForNow}
            onClose={handleCloseOverrun}
          />
        </div>
      </FlowContainer>
    );
  }

  // Completion transition
  if (focusState === 'completing' && completionData) {
    return (
      <CompletionTransition
        milestone={completionData.milestone}
        completedCount={completionData.completedCount}
        totalCount={completionData.totalCount}
        isFinal={completionData.isFinal}
        onTransitionEnd={handleCompletionTransitionEnd}
      />
    );
  }

  // Exit warning
  if (focusState === 'exit_warning' && flow) {
    return (
      <>
        <FlowContainer onBackClick={handleBackClick}>
          {activeNode && (
            <div className="pt-8">
              <div className="flex items-start justify-between mb-8">
                <ActiveTaskCard
                  node={activeNode}
                  totalNodes={nodes.length}
                  completedCount={completedCount}
                  onMarkComplete={handleMarkComplete}
                  onPause={handlePause}
                  onExplainStep={handleExplainStep}
                  isCompleting={isCompleting}
                  explanation={explanation}
                  isLoadingExplanation={isLoadingExplanation}
                  showExplanation={showExplanation}
                  onToggleExplanation={() => setShowExplanation(!showExplanation)}
                />
              </div>
            </div>
          )}
        </FlowContainer>
        <ExitWarningModal
          flowTitle={flow.title}
          completedCount={completedCount}
          totalCount={nodes.length}
          onStayFocused={() => setFocusState('active')}
          onLeave={handleLeave}
          isLeaving={isLeaving}
        />
      </>
    );
  }

  // Active state — main execution view
  if (focusState === 'active' && activeNode && flow) {
    return (
      <FlowContainer onBackClick={handleBackClick}>
        <div className="pt-8">
          {/* Header row: step info + timer */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex-1">
              <ActiveTaskCard
                node={activeNode}
                totalNodes={nodes.length}
                completedCount={completedCount}
                onMarkComplete={handleMarkComplete}
                onPause={handlePause}
                onExplainStep={handleExplainStep}
                isCompleting={isCompleting}
                explanation={explanation}
                isLoadingExplanation={isLoadingExplanation}
                showExplanation={showExplanation}
                onToggleExplanation={() => setShowExplanation(!showExplanation)}
              />
            </div>
            <div className="flex-shrink-0 ml-8 pt-8">
              <TaskTimer
                accumulatedMs={activeNode.accumulated_duration_ms}
                lastResumedAt={activeNode.last_resumed_at}
                estimatedMs={activeNode.estimated_duration_ms}
              />
            </div>
          </div>
        </div>

        {/* Get Unstuck floating button */}
        <div className="fixed right-6 top-1/2 -translate-y-1/2 z-30">
          <button
            onClick={() => setUnstuckStage('choice')}
            className="flex flex-col items-center gap-1.5 bg-[#1E293B] hover:bg-[#283548] border border-[#334155] rounded-xl px-3 py-3 text-gray-400 hover:text-blue-400 transition-all shadow-lg"
            title="Get unstuck"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span className="text-[9px] font-bold tracking-wider uppercase">Get<br />Unstuck</span>
          </button>
        </div>

        {unstuckStage !== 'closed' && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 px-4">
            <div className="w-full max-w-xl rounded-2xl border border-[#334155] bg-[#0F172A]/95 backdrop-blur-xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm md:text-base font-bold tracking-wide text-white uppercase">Get Unstuck</h3>
                <button
                  onClick={closeUnstuck}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Close Get Unstuck"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {unstuckError && (
                <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                  {unstuckError}
                </div>
              )}

              {unstuckStage === 'choice' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-300">Choose how you want recovery help for this task.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => requestUnstuck('none', '')}
                      className="rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white hover:bg-[#283548] transition-colors"
                    >
                      Proceed
                    </button>
                    <button
                      onClick={() => setUnstuckStage('context')}
                      className="rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white hover:bg-[#283548] transition-colors"
                    >
                      Add Context
                    </button>
                  </div>
                </div>
              )}

              {unstuckStage === 'context' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => setUnstuckBlockType('dont_know_how_to_start')}
                      className={`rounded-lg border px-3 py-2 text-sm text-left transition-colors ${unstuckBlockType === 'dont_know_how_to_start' ? 'border-blue-400 bg-blue-500/20 text-white' : 'border-[#334155] bg-[#111827] text-gray-300 hover:bg-[#1f2937]'}`}
                    >
                      I don&apos;t know how to start
                    </button>
                    <button
                      onClick={() => setUnstuckBlockType('waiting_on_something')}
                      className={`rounded-lg border px-3 py-2 text-sm text-left transition-colors ${unstuckBlockType === 'waiting_on_something' ? 'border-blue-400 bg-blue-500/20 text-white' : 'border-[#334155] bg-[#111827] text-gray-300 hover:bg-[#1f2937]'}`}
                    >
                      I&apos;m waiting on something
                    </button>
                    <button
                      onClick={() => setUnstuckBlockType('task_feels_too_big')}
                      className={`rounded-lg border px-3 py-2 text-sm text-left transition-colors ${unstuckBlockType === 'task_feels_too_big' ? 'border-blue-400 bg-blue-500/20 text-white' : 'border-[#334155] bg-[#111827] text-gray-300 hover:bg-[#1f2937]'}`}
                    >
                      This task feels too big
                    </button>
                  </div>

                  <textarea
                    value={unstuckContext}
                    onChange={(e) => setUnstuckContext(e.target.value)}
                    rows={3}
                    placeholder="Optional: add brief context"
                    className="w-full rounded-lg border border-[#334155] bg-[#111827] px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                  />

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setUnstuckStage('choice')}
                      className="rounded-lg border border-[#334155] bg-[#111827] px-3 py-2 text-sm text-gray-300 hover:bg-[#1f2937]"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => requestUnstuck(unstuckBlockType, unstuckContext)}
                      className="rounded-lg border border-blue-500/50 bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                    >
                      Submit
                    </button>
                  </div>
                </div>
              )}

              {unstuckStage === 'loading' && (
                <div className="py-8 text-center text-sm text-gray-300">Generating a recovery path...</div>
              )}

              {unstuckStage === 'result' && unstuckResult && (
                <div className="space-y-3 text-sm">
                  <ResultRow label="What is blocking you" value={unstuckResult.what_is_blocking_you} />
                  <ResultRow label="Do this now" value={unstuckResult.do_this_now} />
                  <ResultRow label="Smallest possible step" value={unstuckResult.smallest_possible_step} />
                  <ResultRow label="Avoid this" value={unstuckResult.avoid_this} />
                  <ResultRow label="Done looks like" value={unstuckResult.done_looks_like} />
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={closeUnstuck}
                      className="rounded-lg border border-[#334155] bg-[#111827] px-3 py-2 text-sm text-gray-200 hover:bg-[#1f2937]"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </FlowContainer>
    );
  }

  // Fallback
  return (
    <FlowContainer backHref="/dashboard">
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center text-gray-500">
          <p className="font-mono text-sm">Initializing...</p>
        </div>
      </div>
    </FlowContainer>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#334155] bg-[#111827]/60 p-3">
      <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">{label}</p>
      <p className="text-gray-200 leading-relaxed">{value}</p>
    </div>
  );
}
