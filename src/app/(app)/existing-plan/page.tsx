'use client';

import React, { useState, useEffect } from 'react';
import { HubContainer } from "@/components/layout/HubContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

import { useRouter } from 'next/navigation';

const EP_STORAGE_KEY = 'poddesk_existingplan_draft';

export default function ExistingPlanPage() {
  const router = useRouter();

  const [pastedPlan, setPastedPlan] = useState("");
  // Single source of truth: 'exact' | 'light' | 'full'
  const [generationMode, setGenerationMode] = useState<'exact' | 'light' | 'full'>('exact');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [fileState, setFileState] = useState<'empty' | 'selected'>('empty');
  const [selectedFileMeta, setSelectedFileMeta] = useState<{name: string, size: number, textContent: string | null} | null>(null);

  // Hydrate form state from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(EP_STORAGE_KEY);
      if (saved) {
        const s = JSON.parse(saved);
        if (s.pastedPlan) setPastedPlan(s.pastedPlan);
        if (s.generationMode) setGenerationMode(s.generationMode);
        // Only restore file state if it has real file meta with a name
        // This prevents stale mock data from persisting
        if (s.fileState === 'selected' && s.selectedFileMeta && s.selectedFileMeta.name) {
          setFileState('selected');
          setSelectedFileMeta(s.selectedFileMeta);
        } else {
          setFileState('empty');
          setSelectedFileMeta(null);
        }
      }
    } catch { /* ignore */ }
    
    // Also clear any legacy stale data from previous mock versions
    try {
      const saved = sessionStorage.getItem(EP_STORAGE_KEY);
      if (saved) {
        const s = JSON.parse(saved);
        // If file meta has the old mock name, nuke it
        if (s.selectedFileMeta?.name === 'poddesk-launch-plan.docx') {
          setFileState('empty');
          setSelectedFileMeta(null);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Persist form state on every change
  useEffect(() => {
    sessionStorage.setItem(EP_STORAGE_KEY, JSON.stringify({
      pastedPlan, generationMode, fileState, selectedFileMeta
    }));
  }, [pastedPlan, generationMode, fileState, selectedFileMeta]);

  const handleCreateFlow = async () => {
    // Build the raw input: file content takes priority, pasted text is supplementary
    let rawInput = '';
    
    if (fileState === 'selected' && selectedFileMeta) {
      if (selectedFileMeta.textContent && selectedFileMeta.textContent.trim()) {
        // Explicitly label the extracted content so the AI knows it's the full document
        rawInput = `--- EXTRACTED DOCUMENT CONTENT (from: ${selectedFileMeta.name}) ---\n\n${selectedFileMeta.textContent}\n\n--- END OF DOCUMENT ---`;
        
        // Append any additional typed instructions
        if (pastedPlan.trim()) {
          rawInput += `\n\n--- ADDITIONAL USER INSTRUCTIONS ---\n${pastedPlan}`;
        }
      } else {
        // File was uploaded but text extraction failed or wasn't supported
        rawInput = pastedPlan || `[File uploaded: ${selectedFileMeta.name} — text extraction was not possible for this file type]`;
      }
    } else {
      rawInput = pastedPlan;
    }
    
    if (!rawInput.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_input: rawInput,
          source: 'existing_plan',
          generation_mode: generationMode === 'exact' ? 'exact_tracking' : 'ai_enhancement',
          ai_intensity: generationMode === 'full' ? 'full_touch' : 'light_touch'
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      if (data.clarification_needed) {
        const stateId = Math.random().toString(36).substring(7);
        sessionStorage.setItem(`clarification_${stateId}`, JSON.stringify({
           source: 'existing_plan',
           raw_input: rawInput,
           generation_mode: generationMode === 'exact' ? 'exact_tracking' : 'ai_enhancement',
           ai_intensity: generationMode === 'full' ? 'full_touch' : 'light_touch',
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

  const [isExtracting, setIsExtracting] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Reset input so the same file can be re-selected
    e.target.value = '';
    
    const meta = { name: file.name, size: file.size, textContent: null as string | null };
    
    setSelectedFileMeta(meta);
    setFileState('selected');
    setIsExtracting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to extract text from file');
        setFileState('empty');
        setSelectedFileMeta(null);
        return;
      }

      setSelectedFileMeta({
        name: file.name,
        size: file.size,
        textContent: data.text,
      });
    } catch (err) {
      console.error('File extraction failed:', err);
      setError(`Upload failed: ${(err as Error).message}`);
      setFileState('empty');
      setSelectedFileMeta(null);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <HubContainer>
      <PageHeader 
        title="Start from an existing plan"
        description="Initialize your operational flow by providing an existing strategic plan or starting fresh."
      />

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: Input Sources */}
        <div className="space-y-6 flex flex-col">
          
          <Card className="border-[#1E293B]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold tracking-wider text-gray-300 uppercase">Upload Document</h3>
              <Badge variant="default">ACTIVE SESSION</Badge>
            </div>
            
            {fileState === 'selected' && selectedFileMeta ? (
              <div className="bg-[#0A0E17] border border-[#1E293B] rounded-lg p-4 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-3 rounded flex items-center justify-center h-12 w-12 text-white shadow-sm shrink-0">
                    📄
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm truncate max-w-[200px]">{selectedFileMeta.name}</p>
                    <p className="text-xs text-gray-400">
                      {(selectedFileMeta.size / 1024 / 1024).toFixed(2)} MB • {
                        isExtracting 
                          ? <span className="text-blue-400">Extracting text...</span>
                          : selectedFileMeta.textContent 
                            ? <span className="text-emerald-400">✓ {selectedFileMeta.textContent.length.toLocaleString()} chars extracted</span>
                            : "Processing..."
                      }
                    </p>
                  </div>
                </div>
                <button onClick={() => { setFileState('empty'); setSelectedFileMeta(null); }} className="text-gray-500 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  🗑️
                </button>
              </div>
            ) : (
               <label className="bg-[#0A0E17] border border-dashed border-[#1E293B] rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-colors w-full gap-2">
                 <input type="file" className="hidden" accept=".pdf,.docx,.doc,.txt,.md,.csv,.json,.xml,.html,.log" onChange={handleFileChange} />
                 <span className="text-sm font-medium text-gray-300">
                    Click to select a document
                 </span>
                 <span className="text-[10px] text-gray-500">PDF, DOCX, TXT, MD, CSV, JSON</span>
              </label>
            )}
            <p className="text-[10px] text-gray-500 mt-4 uppercase">Text will be extracted automatically from PDF and DOCX</p>
          </Card>

          <Card className="flex-1 flex flex-col border-[#1E293B]">
            <h3 className="text-sm font-bold tracking-wider text-gray-300 uppercase mb-4">Paste Your Plan</h3>
            <div className="flex-1 relative bg-[#0A0E17] border border-[#1E293B] rounded-lg p-4 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 transition-shadow">
              <textarea 
                value={pastedPlan}
                onChange={(e) => setPastedPlan(e.target.value)}
                placeholder="Manually enter strategic directives, milestones, or raw notes here..."
                className="w-full h-full min-h-[250px] bg-transparent resize-none border-none text-gray-300 placeholder:text-gray-600 focus:ring-0 focus:outline-none"
              />
              <div className="absolute bottom-3 right-4 text-[10px] text-gray-500 font-mono">
                CHARS: {pastedPlan.length}
              </div>
            </div>
          </Card>

        </div>

        {/* RIGHT COLUMN: Previews & Controls */}
        <div className="space-y-6 flex flex-col">
          
          <Card className="border-[#1E293B]">
             <h3 className="text-sm font-bold tracking-wider text-gray-300 uppercase mb-4 flex items-center gap-2">
               <span className="text-blue-400">👁️</span> Extracted Preview
             </h3>
             <div className="bg-[#0A0E17] rounded-lg p-5 border border-transparent font-mono text-sm text-gray-400 leading-relaxed max-h-[250px] overflow-y-auto">
                {fileState === 'selected' && selectedFileMeta ? (
                  <>
                    {selectedFileMeta.textContent ? (
                        <>Extracted text:<br/><br/><span className="text-blue-400 italic">{selectedFileMeta.textContent}</span></>
                    ) : (
                        <>&quot;Document <span className="text-blue-400 italic">{selectedFileMeta.name}</span> attached. Analysis processing during execution generation...&quot;</>
                    )}
                  </>
                ) : pastedPlan ? (
                  pastedPlan
                ) : (
                  "Waiting for input..."
                )}
             </div>
          </Card>

          <Card className="border-[#1E293B] p-6 space-y-6 flex-1">
             <div>
               <h4 className="font-semibold text-white mb-1">Generation Mode</h4>
               <p className="text-sm text-gray-400 mb-5">Choose how the AI processes your input</p>
             </div>

             <SegmentedControl 
               value={generationMode}
               onChange={(val) => setGenerationMode(val as 'exact' | 'light' | 'full')}
               options={[
                 { label: 'Exact Tracking', value: 'exact' },
                 { label: 'Light Touch', value: 'light' },
                 { label: 'Full Touch', value: 'full' }
               ]}
               fullWidth
               className="p-1"
             />

             <div className="bg-[#0A0E17] rounded-lg p-4 border border-[#1E293B] text-sm text-gray-400 mt-2">
               {generationMode === 'exact' && (
                 <p>📌 <span className="text-white font-medium">Exact Tracking</span> — Follow your document structure strictly. No reordering, no new steps injected.</p>
               )}
               {generationMode === 'light' && (
                 <p>✨ <span className="text-white font-medium">Light Touch</span> <Badge variant="warning">Beta</Badge> — Preserve your structure with minimal clarifying improvements.</p>
               )}
               {generationMode === 'full' && (
                 <p>🚀 <span className="text-white font-medium">Full Touch</span> <Badge variant="warning">Beta</Badge> — AI may reorder, add prerequisites, and optimize the sequence.</p>
               )}
             </div>
               
             <Button 
               size="lg" 
               variant="primary"
               className="w-full font-bold shadow-lg shadow-blue-900/20 group flex justify-between items-center pr-2 mt-4"
               onClick={handleCreateFlow}
               disabled={isGenerating || (fileState === 'empty' && !pastedPlan.trim())}
             >
               {isGenerating ? 'CREATING FLOW...' : 'CREATE FLOW'}
               <span className="bg-white/20 p-2 rounded ml-2 group-hover:translate-x-1 transition-transform leading-none">→</span>
             </Button>
          </Card>

          <div className="border border-gray-700/50 rounded-lg p-5 bg-[#0A0E17]/40 flex gap-4 items-start text-sm text-gray-400">
             <div className="shrink-0 w-6 h-6 rounded-full bg-gray-600/30 flex items-center justify-center text-gray-300 font-bold text-xs mt-0.5">
               i
             </div>
             <p className="leading-relaxed">
               Creating a flow will automatically generate tasks, milestones, and resource allocations based on your input. You can refine these in the Dashboard after generation.
             </p>
          </div>

        </div>

      </div>
    </HubContainer>
  );
}

