'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { FlowContainer } from "@/components/layout/FlowContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useRouter, useSearchParams } from "next/navigation";

interface ClarificationState {
  source: 'brain_dump' | 'existing_plan';
  raw_input: string;
  generation_mode?: 'exact_tracking' | 'ai_enhancement';
  ai_intensity?: 'light_touch' | 'full_touch';
  context?: {
    primary_goal?: string;
    constraints?: string;
    optimization_style?: string;
  };
  questions: string[];
  interpretation_summary?: string | null;
  existing_flow_id?: string;
}

function ClarificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stateId = searchParams.get('state');

  const [sessionData, setSessionData] = useState<ClarificationState | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [isResuming, setIsResuming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine which mode we're in
  const isConfirmationMode = sessionData
    ? sessionData.questions.length === 0 && !!sessionData.interpretation_summary
    : false;

  useEffect(() => {
    if (stateId) {
      const data = sessionStorage.getItem(`clarification_${stateId}`);
      if (data) {
        const parsed: ClarificationState = JSON.parse(data);
        setSessionData(parsed);
        setAnswers(new Array(parsed.questions.length).fill(""));
      }
    }
  }, [stateId]);

  const handleAnswerChange = (index: number, val: string) => {
    const nextAnswers = [...answers];
    nextAnswers[index] = val;
    setAnswers(nextAnswers);
  };

  const handleResume = async () => {
    if (!sessionData) return;
    // In question mode, all answers must be filled
    if (!isConfirmationMode && answers.some(a => !a.trim())) return;

    setIsResuming(true);
    setError(null);

    try {
      const res = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_input: sessionData.raw_input,
          source: sessionData.source,
          generation_mode: sessionData.generation_mode || 'ai_enhancement',
          ai_intensity: sessionData.ai_intensity,
          context: sessionData.context,
          // In confirmation mode, send empty answers to signal "user confirmed"
          clarification_answers: isConfirmationMode ? ['confirmed'] : answers,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      if (data.clarification_needed) {
        // Deep clarification — update state in place
        setSessionData({
          ...sessionData,
          questions: data.clarification_questions || [],
          interpretation_summary: data.interpretation_summary || null,
        });
        setAnswers(new Array((data.clarification_questions || []).length).fill(""));
      } else {
        // Success — cleanup and route to Review
        sessionStorage.removeItem(`clarification_${stateId}`);
        router.push(`/flow/${data.flow_id}/review`);
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsResuming(false);
    }
  };

  if (!sessionData) {
    return (
       <div className="min-h-screen bg-[#0A0E17] flex items-center justify-center p-6">
          <Card className="max-w-md w-full text-center">
             <h2 className="text-xl font-bold text-white mb-4">No active session</h2>
             <p className="text-gray-400 mb-6">This clarification session has expired or is invalid.</p>
             <Button onClick={() => router.push('/brain-dump')}>Back to Start</Button>
          </Card>
       </div>
    );
  }

  return (
    <FlowContainer>
      <div className="max-w-2xl mx-auto py-12 px-6">
        <div className="mb-10">
          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-400 mb-4">
            {isConfirmationMode ? 'CONFIRM INTERPRETATION' : 'CLARIFICATION NEEDED'}
          </span>
          <h1 className="text-3xl font-bold text-white mb-4">
            {isConfirmationMode ? 'Does this look right?' : 'Almost there...'}
          </h1>
          <p className="text-gray-400">
            {isConfirmationMode
              ? 'Before generating your execution flow, confirm that this interpretation of your input is accurate.'
              : 'The AI engine needs a bit more clarity about your project to build a high-precision execution flow.'
            }
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ─── Interpretation Confirmation Mode ─── */}
        {isConfirmationMode && sessionData.interpretation_summary && (
          <div className="space-y-8">
            <Card className="border-blue-500/20 bg-[#121A2F]/40">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-blue-400 text-sm">🎯</span>
                <span className="text-xs font-bold tracking-wider text-blue-400 uppercase">System Interpretation</span>
              </div>
              <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                {sessionData.interpretation_summary}
              </p>
            </Card>

            <div className="pt-6 border-t border-[#1E293B] flex items-center justify-between">
              <Button variant="secondary" onClick={() => router.back()}>GO BACK</Button>
              <Button 
                  className="px-10 font-bold bg-blue-600 hover:bg-blue-500 flex items-center gap-2"
                  onClick={handleResume}
                  disabled={isResuming}
              >
                {isResuming ? 'GENERATING...' : 'LOOKS GOOD — CONTINUE'}
                <span className="leading-none text-xl">→</span>
              </Button>
            </div>
          </div>
        )}

        {/* ─── Question Mode (existing behavior) ─── */}
        {!isConfirmationMode && (
          <div className="space-y-8">
            {sessionData.questions.map((q: string, i: number) => (
              <div key={i} className="space-y-4">
                 <label className="block text-sm font-semibold text-gray-200">
                   {i + 1}. {q}
                 </label>
                 <textarea
                   value={answers[i]}
                   onChange={(e) => handleAnswerChange(i, e.target.value)}
                   className="w-full bg-[#121A2F]/50 border border-[#1E293B] rounded-lg p-4 text-sm text-gray-300 focus:ring-1 focus:ring-blue-500 focus:outline-none min-h-[100px] placeholder:text-gray-600 resize-none"
                   placeholder="Enter your detailed response..."
                 />
              </div>
            ))}

            <div className="pt-6 border-t border-[#1E293B] flex items-center justify-between">
              <Button variant="secondary" onClick={() => router.back()}>GO BACK</Button>
              <Button 
                  className="px-10 font-bold bg-blue-600 hover:bg-blue-500 flex items-center gap-2"
                  onClick={handleResume}
                  disabled={isResuming || answers.some(a => !a.trim())}
              >
                {isResuming ? 'REBUILDING FLOW...' : 'RESUME GENERATION'}
                <span className="leading-none text-xl">→</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </FlowContainer>
  );
}

export default function ClarificationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0E17] flex items-center justify-center p-6 font-mono text-blue-400 text-sm animate-pulse">
        STABILIZING SESSION...
      </div>
    }>
      <ClarificationContent />
    </Suspense>
  );
}
