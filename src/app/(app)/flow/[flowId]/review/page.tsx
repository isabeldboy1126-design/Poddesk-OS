'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { FlowContainer } from "@/components/layout/FlowContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Accordion } from "@/components/ui/Accordion";
import { Flow, Node } from "@/types/database";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";

export default function ReviewGatePage({ params }: { params: { flowId: string } }) {
  const router = useRouter();
  const { flowId } = params;

  const [flow, setFlow] = useState<Flow | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authTransitionMessage, setAuthTransitionMessage] = useState("");
  const [addedContext, setAddedContext] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/flows/${flowId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch flow');
      setFlow(data.flow);
      setNodes(data.nodes);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [flowId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRegenerate = async () => {
    if (!addedContext.trim()) return;
    setIsRegenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/flows/${flowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          added_context: addedContext,
          // Source and generation_mode are read from the persisted flow server-side
          // so we don't need to send them — the PUT handler reads from DB
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Regeneration failed');
      
      if (data.clarification_needed) {
        // Handle clarification from regeneration — store state and route
        const stateId = Math.random().toString(36).substring(7);
        sessionStorage.setItem(`clarification_${stateId}`, JSON.stringify({
          source: flow?.source || 'brain_dump',
          raw_input: flow?.raw_input || '',
          generation_mode: flow?.generation_mode || 'ai_enhancement',
          questions: data.clarification_questions || [],
          interpretation_summary: data.interpretation_summary || null,
          existing_flow_id: flowId,
        }));
        router.push(`/flow/clarification?state=${stateId}`);
      } else {
        // Success — refresh with updated data
        setAddedContext("");
        fetchData();
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleBegin = async () => {
    setIsAuthorizing(true);
    setAuthTransitionMessage("Securing execution environment...");

    try {
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setAuthTransitionMessage("Entering Focus Mode...");
        
        // Safety net: Attach flow to ensure it's not orphaned
        try {
          await fetch(`/api/flows/${flowId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'attach' }),
          });
        } catch (err) {
          console.error("Attach safety net failed:", err);
          // Non-fatal, proceed to focus anyway
        }

        // Intentional small handoff for already-authenticated
        setTimeout(() => {
          router.push(`/flow/${flowId}/focus`);
        }, 1200);
      } else {
        // Precise continuity state preservation
        const continuityState = {
          pendingFlowId: flowId,
          savedAt: Date.now()
        };
        sessionStorage.setItem('poddesk_auth_continuity', JSON.stringify(continuityState));
        
        setAuthTransitionMessage("Your flow has been created. Log in to access execution.");
        
        setTimeout(() => {
          router.push('/login');
        }, 1500);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
      // Fallback redirect if check fails
      router.push('/login');
    }
  };

  // Compute estimated total duration from nodes
  const totalEstimatedMinutes = nodes.reduce((sum, n) => {
    return sum + (n.estimated_duration_ms ? n.estimated_duration_ms / 1000 / 60 : 0);
  }, 0);

  if (isLoading || isAuthorizing) {
    return (
      <FlowContainer>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-6">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-blue-400 font-mono text-sm tracking-widest uppercase">
              {isAuthorizing ? authTransitionMessage : "LOADING EXECUTION FLOW..."}
            </div>
          </div>
        </div>
      </FlowContainer>
    );
  }

  if (error || !flow) {
    return (
      <FlowContainer>
        <Card className="border-red-500/50 bg-red-500/5 p-8 text-center max-w-lg mx-auto mt-20">
          <h2 className="text-xl font-bold text-red-400 mb-4">Error Loading Flow</h2>
          <p className="text-gray-400 mb-8">{error || 'Flow not found.'}</p>
          <Button onClick={() => router.push('/brain-dump')}>Back to Intake</Button>
        </Card>
      </FlowContainer>
    );
  }

  return (
    <FlowContainer>
      {/* ─── Review Gate Header (no sidebar, no source-switcher) ─── */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <Badge variant="info">REVIEW GATE</Badge>
          <Badge variant="default">{flow.generation_mode?.replace('_', ' ').toUpperCase()}</Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">{flow.title}</h1>
        <p className="text-gray-400 text-base leading-relaxed">
          Review and validate your generated execution flow before locking it for focused execution.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Metadata & Regeneration */}
        <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
          <Card className="border-[#1E293B] bg-[#121A2F]/20">
            <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase mb-6">Execution Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-[#1E293B]">
                <span className="text-xs text-gray-500">DETECTED GOAL</span>
                <span className="text-sm text-gray-200 text-right max-w-[60%]">{flow.detected_goal || 'Not specified'}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-[#1E293B]">
                <span className="text-xs text-gray-500">TASK COUNT</span>
                <span className="text-sm text-gray-200">{flow.task_count} atomic tasks</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-[#1E293B]">
                <span className="text-xs text-gray-500">EST. DURATION</span>
                <span className="text-sm text-gray-200">{Math.round(totalEstimatedMinutes)} min</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-[#1E293B]">
                <span className="text-xs text-gray-500">AI CONFIDENCE</span>
                <Badge variant={flow.ai_confidence && flow.ai_confidence > 80 ? 'info' : 'warning'}>
                  {flow.ai_confidence}%
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">SOURCE</span>
                <Badge variant="default">
                  {flow.source?.replace('_', ' ').toUpperCase() || 'BRAIN DUMP'}
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="border-[#1E293B]">
            <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase mb-6 flex items-center gap-2">
               <span className="bg-blue-500/10 text-blue-400 p-1 rounded leading-none text-xs">⚡</span> Add Context + Regenerate
            </h3>
            <p className="text-xs text-gray-500 mb-4 italic leading-relaxed">
              Not quite right? Add details about specific deadlines, prerequisite tools, or missing steps and regenerate the whole flow.
            </p>
            <textarea
              value={addedContext}
              onChange={(e) => setAddedContext(e.target.value)}
              placeholder="e.g. Include a task for getting the AWS credentials from the ops team..."
              className="w-full min-h-[120px] bg-[#0A0E17] border border-[#1E293B] rounded-lg p-3 text-sm text-gray-300 focus:ring-1 focus:ring-blue-500 focus:outline-none mb-4 placeholder:text-gray-600 resize-none"
            />
            <Button 
              variant="secondary" 
              className="w-full text-xs font-bold border-gray-700 hover:border-blue-500/50" 
              onClick={handleRegenerate}
              disabled={isRegenerating || !addedContext.trim()}
            >
              {isRegenerating ? 'REGENERATING...' : 'REGENERATE FLOW'}
            </Button>
          </Card>

          <Button 
            size="lg" 
            className="w-full font-bold shadow-xl shadow-blue-900/10 group bg-blue-600 hover:bg-blue-500 flex justify-between pr-2"
            onClick={handleBegin}
          >
            LOCK FLOW & BEGIN
            <span className="bg-white/20 p-2 rounded ml-2 group-hover:translate-x-1 transition-transform leading-none">→</span>
          </Button>
        </div>

        {/* RIGHT COLUMN: Task List (Accordions) */}
        <div className="lg:col-span-2 space-y-4 order-1 lg:order-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase">Generated Execution Sequence</h3>
            <span className="text-[10px] text-gray-600 font-mono">{nodes.length} TASKS</span>
          </div>

          <div className="space-y-3">
            {nodes.map((node) => (
              <Accordion 
                key={node.id}
                title={
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-blue-400/60 shrink-0 w-6 text-center bg-blue-500/5 rounded py-0.5">{node.order_index}</span>
                    <span className="text-sm font-medium text-gray-200 line-clamp-1">{node.title}</span>
                    <div className="flex items-center gap-2 ml-auto shrink-0">
                      {node.milestone && (
                        <Badge variant="info">{node.milestone}</Badge>
                      )}
                      <span className="text-[10px] text-gray-600 font-mono">
                        {node.estimated_duration_ms ? Math.round(node.estimated_duration_ms / 1000 / 60) : 0}m
                      </span>
                    </div>
                  </div>
                }
              >
                <div className="space-y-4 text-sm leading-relaxed">
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 block uppercase mb-1">TASK DESCRIPTION</span>
                    <p className="text-gray-300">{node.description || 'No additional details.'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 block uppercase mb-1">DONE DEFINITION</span>
                      <p className="text-gray-400 italic text-xs">{node.done_definition}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-gray-500 block uppercase mb-1">PROVENANCE</span>
                      <Badge variant={node.provenance === 'user_originated' ? 'default' : 'warning'}>
                        {node.provenance?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Accordion>
            ))}
          </div>
        </div>

      </div>
    </FlowContainer>
  );
}
