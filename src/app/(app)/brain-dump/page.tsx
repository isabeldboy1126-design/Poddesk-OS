'use client';

import React, { useState, useEffect } from 'react';
import { HubContainer } from "@/components/layout/HubContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

import { useRouter } from 'next/navigation';

const BD_STORAGE_KEY = 'poddesk_braindump_draft';

export default function BrainDumpPage() {
  const router = useRouter();

  const [draftText, setDraftText] = useState("");
  const [enhancedText, setEnhancedText] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [constraints, setConstraints] = useState("");
  const [optStyle, setOptStyle] = useState("speed");
  const [isRefining, setIsRefining] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate form state from sessionStorage on mount (preserves input on back-navigation)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(BD_STORAGE_KEY);
      if (saved) {
        const s = JSON.parse(saved);
        if (s.draftText) setDraftText(s.draftText);
        if (s.enhancedText) setEnhancedText(s.enhancedText);
        if (s.primaryGoal) setPrimaryGoal(s.primaryGoal);
        if (s.constraints) setConstraints(s.constraints);
        if (s.optStyle) setOptStyle(s.optStyle);
      }
    } catch { /* ignore parse errors */ }
  }, []);

  // Persist form state to sessionStorage on every change
  useEffect(() => {
    sessionStorage.setItem(BD_STORAGE_KEY, JSON.stringify({
      draftText, enhancedText, primaryGoal, constraints, optStyle
    }));
  }, [draftText, enhancedText, primaryGoal, constraints, optStyle]);

  const handleRefine = async () => {
    if (!draftText.trim()) return;
    setIsRefining(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: draftText, mode: 'brain_dump' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Enhancement failed');
      setEnhancedText(data.enhanced_text);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsRefining(false);
    }
  };

  const handleGenerate = async () => {
    if (!draftText.trim()) return;
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_input: draftText,
          enhanced_input: enhancedText,
          source: 'brain_dump',
          generation_mode: 'ai_enhancement', // Brain dump always defaults to enhancement for best results
          context: {
            primary_goal: primaryGoal,
            constraints: constraints,
            optimization_style: optStyle,
          }
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      if (data.clarification_needed) {
        const stateId = Math.random().toString(36).substring(7);
        sessionStorage.setItem(`clarification_${stateId}`, JSON.stringify({
           source: 'brain_dump',
           raw_input: draftText,
           context: { primary_goal: primaryGoal, constraints: constraints, optimization_style: optStyle },
           questions: data.clarification_questions || [],
           interpretation_summary: data.interpretation_summary || null,
        }));
        router.push(`/flow/clarification?state=${stateId}`);
      } else {
        router.push(`/flow/${data.flow_id}/review`);
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <HubContainer>
      <PageHeader 
        title="The Brain Dump"
        description="Clear your cognitive load. Paste messy notes, upload a PRD, or answer a few guided prompts to define your execution flow."
      />

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Main Editing area */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          
          <Card className="flex-1 flex flex-col bg-[#121A2F]/50 border-[#1E293B]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                 <span className="bg-[#3B82F6] flex items-center justify-center rounded-full w-6 h-6 text-white text-xs">🧠</span>
                 <h2 className="text-lg font-semibold text-white">Unstructured Thought</h2>
              </div>
              <div className="flex gap-2">
                <Badge variant="default">LIVE DRAFT</Badge>
                <Badge variant="info">AI READY</Badge>
              </div>
            </div>
            
            <textarea 
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder="Type everything here... project scope, deadlines, random worries, feature ideas, constraints. Don't worry about formatting. The monolith will organize it."
              className="w-full flex-1 min-h-[300px] bg-transparent resize-none border-none text-gray-300 placeholder:text-gray-600 focus:ring-0 focus:outline-none p-2"
            />
            
            <div className="flex justify-end mt-4">
              <Button onClick={handleRefine} disabled={isRefining || !draftText.trim()} className="bg-blue-100/10 text-blue-400 hover:bg-blue-100/20">
                {isRefining ? 'Refining...' : 'Refine Input ✨'}
              </Button>
            </div>
          </Card>

          {/* PROMPT ENHANCEMENT REVIEW */}
          <Card className="border-t-4 border-t-[#1E293B]">
            <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase mb-4">Prompt Enhancement Review</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-500 font-semibold mb-2 block">ORIGINAL IDEA</span>
                <div className="bg-[#0A0E17] p-4 rounded-lg text-sm text-gray-400 italic font-mono border border-[rgba(255,255,255,0.05)] whitespace-pre-wrap min-h-[150px]">
                  {draftText || '&quot;Need to launch the poddesk app by friday. lots of bugs in the auth flow...&quot;'}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-blue-400 font-semibold">AI OPTIMIZED</span>
                  {enhancedText && <span className="text-[10px] text-emerald-400 font-medium">✎ Editable</span>}
                </div>
                {isRefining ? (
                  <div className="bg-[#121A2F] p-4 rounded-lg text-sm text-gray-200 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)] min-h-[150px] flex items-center justify-center">
                    Optimization running...
                  </div>
                ) : (
                  <div className="relative">
                    <textarea 
                      value={enhancedText}
                      onChange={(e) => setEnhancedText(e.target.value)}
                      placeholder="Click 'Refine Input ✨' above first. Once generated, you can click here and edit the AI text."
                      rows={7}
                      style={{ display: 'block', minHeight: '150px' }}
                      className="bg-[#121A2F] p-4 rounded-lg text-sm text-gray-200 border border-[#334155] hover:border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.1)] w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-text transition-colors"
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>

        </div>

        {/* RIGHT COLUMN: Scaffolding / Context */}
        <div className="lg:col-span-1 space-y-6 flex flex-col">
          
          <Card className="border-dashed border-2 border-[#1E293B] bg-[#0A0E17]/50 hover:bg-[#1E293B]/20 transition-colors cursor-pointer group">
            <h3 className="text-sm font-bold tracking-wider text-gray-300 uppercase mb-6 flex items-center gap-2">
              <span className="bg-gray-800 p-1 rounded">📄</span> Import Blueprint
            </h3>
            <p className="text-gray-400 text-sm mb-6">Have a PRD or a spreadsheet already? Drop it here to seed the execution flow.</p>
            <label className="w-full aspect-video border border-dashed border-gray-700/50 rounded-lg flex flex-col items-center justify-center text-center p-6 group-hover:border-blue-500/50 transition-colors cursor-pointer">
              <input 
                type="file" 
                className="hidden" 
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  const textExtensions = ['.txt', '.md', '.csv', '.json', '.xml', '.html', '.rtf', '.log'];
                  const isTextFile = file.type.startsWith('text/') || 
                                     file.type === 'application/json' ||
                                     textExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
                  
                  if (isTextFile) {
                    try {
                      const text = await file.text();
                      setDraftText(prev => prev + (prev ? '\n\n' : '') + text);
                    } catch (err) { 
                      console.error('Failed to read file:', err);
                      setDraftText(prev => prev + (prev ? '\n\n' : '') + `[Failed to read: ${file.name}]`);
                    }
                  } else {
                    setDraftText(prev => prev + (prev ? '\n\n' : '') + `[Attached: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]`);
                  }
                  
                  e.target.value = '';
                }} 
              />
              <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 mb-3">+</div>
              <span className="text-sm font-medium text-gray-300">Click to upload a file</span>
              <span className="text-xs text-gray-500 mt-1">Supports .txt, .md, .csv, .json and more</span>
            </label>
          </Card>

          <Card className="flex-1 border-[#1E293B]">
             <h3 className="text-sm font-bold tracking-wider text-gray-300 uppercase mb-6 flex items-center gap-2">
              <span className="bg-[#FCA5A5]/20 text-red-300 p-1 rounded leading-none">?</span> Add Context
            </h3>
            
            <div className="space-y-5">
              <Input 
                label="PRIMARY GOAL"
                placeholder="e.g., Q3 Launch Success"
                value={primaryGoal}
                onChange={(e) => setPrimaryGoal(e.target.value)}
              />
              <Input 
                label="CONSTRAINTS"
                placeholder="e.g., No budget for external QA"
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
              />
              
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-2 uppercase tracking-wide mt-2">Optimization Style</label>
                <SegmentedControl 
                  fullWidth
                  value={optStyle}
                  onChange={setOptStyle}
                  options={[
                    { label: 'SPEED', value: 'speed' },
                    { label: 'QUALITY', value: 'quality' },
                    { label: 'BUDGET', value: 'budget' }
                  ]}
                />
              </div>
            </div>
          </Card>

          <Button 
            size="lg" 
            className="w-full font-bold shadow-lg shadow-blue-900/20 group flex justify-between items-center pr-2"
            onClick={handleGenerate}
            disabled={isGenerating || !draftText.trim()}
          >
            {isGenerating ? 'GENERATING...' : 'GENERATE EXECUTION PLAN'}
            <span className="bg-white/20 p-2 rounded ml-2 group-hover:translate-x-1 transition-transform">→</span>
          </Button>

        </div>

      </div>
    </HubContainer>
  );
}
