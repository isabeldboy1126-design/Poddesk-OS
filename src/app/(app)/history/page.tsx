'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { HubContainer } from '@/components/layout/HubContainer';
import { SyntheticEvent } from '@/app/api/history/route';

interface HistoryData {
  events: SyntheticEvent[];
  summary: {
    activeCount: number;
    completedCount: number;
    mostActiveFlowTitle: string | null;
  };
}

export default function HistoryPage() {
  const [data, setData] = useState<HistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [flowTypeFilter, setFlowTypeFilter] = useState<'All' | 'brain_dump' | 'existing_plan'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'active' | 'completed' | 'abandoned'>('All');

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/api/history');
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchHistory();
  }, []);

  // Filter events based on selections
  const filteredEvents = useMemo(() => {
    if (!data) return [];
    return data.events.filter((ev) => {
      // Flow Type filter
      if (flowTypeFilter !== 'All' && ev.flow_source !== flowTypeFilter) return false;
      // Status filter
      if (statusFilter !== 'All' && ev.flow_status !== statusFilter) {
         // Special case: active/review are grouped in UI as 'active'
         if (statusFilter === 'active' && ev.flow_status !== 'review') return false; 
         // For simplicity, strict equality fallback
         if (statusFilter !== 'active' && ev.flow_status !== statusFilter) return false;
      }
      // Search
      if (search) {
        const q = search.toLowerCase();
        if (!ev.flow_title.toLowerCase().includes(q) && 
            !(ev.node_title && ev.node_title.toLowerCase().includes(q)) && 
            !ev.event_type.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [data, search, flowTypeFilter, statusFilter]);

  // Group events by flow ID, maintaining chronological order of groups
  const groupedFlows = useMemo(() => {
    const groups: Record<string, SyntheticEvent[]> = {};
    const flowOrder: string[] = []; // Preserve order of first appearance (most recent)
    
    filteredEvents.forEach(ev => {
      if (!groups[ev.flow_id]) {
        groups[ev.flow_id] = [];
        flowOrder.push(ev.flow_id);
      }
      groups[ev.flow_id].push(ev);
    });

    return flowOrder.map(id => ({
      flowId: id,
      events: groups[id]
    }));
  }, [filteredEvents]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'task_completed':
      case 'flow_completed':
        return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>;
      case 'flow_started':
      case 'task_started':
        return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
      case 'flow_created':
        return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>;
      default:
        return <div className="w-2 h-2 rounded-full bg-gray-500" />;
    }
  };

  const formatEventType = (ev: SyntheticEvent) => {
    switch(ev.event_type) {
      case 'task_completed': return `Task completed: ${ev.node_title}`;
      case 'task_started': return `Task started: ${ev.node_title}`;
      case 'flow_created': return `Flow generated: ${ev.flow_title}`;
      case 'flow_started': return `Execution started: ${ev.flow_title}`;
      case 'flow_completed': return `Flow finalized: ${ev.flow_title}`;
      case 'flow_abandoned': return `Flow abandoned: ${ev.flow_title}`;
      default: return ev.event_type;
    }
  };

  const getEventSubtitle = (ev: SyntheticEvent) => {
     switch(ev.event_type) {
       case 'flow_created': return `Source: ${ev.flow_source === 'existing_plan' ? 'Existing Plan' : 'Brain Dump'}`;
       case 'task_completed': return `Logged dynamically during execution`;
       default: return `Automatic telemetry`;
     }
  };

  return (
    <HubContainer>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">History</h1>
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input 
            type="text" 
            placeholder="Search logs..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#121A2F] border border-[#1E293B] rounded-lg pl-9 pr-4 py-2 w-full md:w-64 text-sm text-white focus:outline-none focus:border-blue-500 placeholder:text-gray-500"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <div className="text-center text-gray-500 p-10">Failed to load history.</div>
      ) : (
        <div className="space-y-6">
          
          {/* ─── Summary Cards ─── */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
            <div className="md:col-span-8 bg-[#161D2C] border border-[#1E293B] rounded-2xl p-8 relative overflow-hidden flex flex-col justify-between">
              <div className="z-10 relative">
                <p className="text-[10px] font-bold tracking-[0.18em] text-blue-300 uppercase mb-3">OPERATIONAL MOMENTUM</p>
                <h2 className="text-3xl font-bold text-white mb-4">
                  {data.events.length} tracked events
                </h2>
                <p className="text-sm text-gray-400 max-w-md leading-relaxed">
                  Your execution velocity remains consistent. Your most active execution stream is currently <span className="font-semibold text-white">{data.summary.mostActiveFlowTitle || 'idle'}</span>. Keep up the momentum.
                </p>
              </div>
              {/* Fake aesthetic chart in background bottom right */}
              <div className="absolute right-0 bottom-0 opacity-[0.03] pointer-events-none">
                 <svg width="300" height="150" viewBox="0 0 300 150">
                    <path d="M0 150 L50 80 L100 110 L150 40 L200 90 L250 20 L300 60 L300 150 Z" fill="white" />
                 </svg>
              </div>
            </div>

            <div className="md:col-span-4 bg-[#161D2C] border border-[#1E293B] rounded-2xl p-8 flex flex-col justify-between">
               <div>
                  <p className="text-[10px] font-bold tracking-[0.18em] text-gray-500 uppercase mb-5">CURRENT FOCUS</p>
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-lg bg-[#1E293B]/50 border border-[#334155]/30 flex items-center justify-center flex-shrink-0 text-blue-400">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2l6.5-6.5a2.12 2.12 0 0 0-3-3l-6.5 6.5Z"/><path d="m15.5 8.5 3-3a2.12 2.12 0 0 0-3-3l-3 3"/></svg>
                     </div>
                     <div>
                       <p className="text-sm font-bold text-white line-clamp-1">{data.summary.mostActiveFlowTitle || 'None Active'}</p>
                       <p className="text-xs text-gray-500 mt-0.5">{data.summary.activeCount} flowing pipelines</p>
                     </div>
                  </div>
               </div>
               <button className="text-[10px] font-bold tracking-wider text-gray-400 uppercase hover:text-white transition-colors flex items-center gap-1 mt-6">
                 VIEW ACTIVE FLOWS <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
               </button>
            </div>
          </div>

          {/* ─── Filters ─── */}
          <div className="flex flex-wrap items-center gap-3">
             <div className="flex items-center gap-2 bg-[#121A2F] border border-[#1E293B] rounded-lg px-3 py-2 text-xs font-semibold text-gray-300">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
               <select 
                 className="bg-transparent border-none outline-none appearance-none cursor-pointer"
                 value={statusFilter}
                 onChange={(e) => setStatusFilter(e.target.value as 'All' | 'active' | 'completed' | 'abandoned')}
               >
                 <option value="All">Status: All</option>
                 <option value="active">Status: Active</option>
                 <option value="completed">Status: Completed</option>
                 <option value="abandoned">Status: Abandoned</option>
               </select>
             </div>

             <div className="flex items-center gap-2 bg-[#121A2F] border border-[#1E293B] rounded-lg px-3 py-2 text-xs font-semibold text-gray-300">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
               <span className="opacity-60 cursor-not-allowed">Date Range</span>
             </div>

             <div className="flex items-center gap-2 bg-[#121A2F] border border-[#1E293B] rounded-lg px-3 py-2 text-xs font-semibold text-gray-300">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
               <select 
                 className="bg-transparent border-none outline-none appearance-none cursor-pointer"
                 value={flowTypeFilter}
                 onChange={(e) => setFlowTypeFilter(e.target.value as 'All' | 'brain_dump' | 'existing_plan')}
               >
                 <option value="All">Flow Type: All</option>
                 <option value="brain_dump">Flow Type: Brain Dump</option>
                 <option value="existing_plan">Flow Type: Existing Plan</option>
               </select>
             </div>
          </div>

          {/* ─── Timeline Feed ─── */}
          <div className="mt-8 space-y-12">
            {groupedFlows.length > 0 ? (
              groupedFlows.map(group => (
                <div key={group.flowId}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${group.events[0].flow_status === 'completed' ? 'bg-emerald-500' : group.events[0].flow_status === 'active' || group.events[0].flow_status === 'review' ? 'bg-blue-500' : 'bg-gray-500'}`} />
                      <h3 className="text-[11px] font-bold text-white tracking-[0.15em] uppercase">{group.events[0].flow_title}</h3>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-[#1E293B]/40 border border-[#334155]/50 text-[10px] font-bold text-gray-400 capitalize self-start md:self-auto">
                      {group.events[0].flow_status === 'completed' 
                        ? 'Completed Flow' 
                        : group.events[0].flow_status === 'abandoned'
                        ? 'Abandoned'
                        : 'Active Flow'}
                    </div>
                  </div>
                  
                  <div className="bg-[#161D2C] border border-[#1E293B] rounded-xl flex flex-col divide-y divide-[#1E293B]">
                    {group.events.map(ev => (
                      <div key={ev.id} className="p-4 md:p-5 flex items-start md:items-center gap-4 md:gap-6 hover:bg-[#1E293B]/20 transition-colors">
                        <div className="text-[11px] font-mono text-gray-500 w-12 pt-1 md:pt-0">
                           {new Date(ev.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-[#1A2234] border border-[#283548] flex-shrink-0 flex items-center justify-center text-blue-400 mt-1 md:mt-0">
                          {getEventIcon(ev.event_type)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">
                             {formatEventType(ev)}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                             {getEventSubtitle(ev)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
               <div className="text-center p-12 border border-dashed border-[#1E293B] rounded-2xl bg-[#161D2C]/50">
                 <p className="text-gray-400 font-medium">No history events found matching your criteria.</p>
               </div>
            )}
          </div>

          {/* ─── Pagination Placeholder ─── */}
          {groupedFlows.length > 0 && (
            <div className="pt-8 flex items-center justify-between mt-12 pb-12">
               <div className="flex gap-2">
                 <button className="px-4 py-2 bg-[#161D2C] border border-[#1E293B] rounded-lg text-xs font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-wider">Previous</button>
                 <button className="px-4 py-2 bg-[#161D2C] border border-[#1E293B] rounded-lg text-xs font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-wider">Next Page</button>
               </div>
               <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-600 hidden md:block">
                 Poddesk Execution Ledger
               </div>
            </div>
          )}

        </div>
      )}
    </HubContainer>
  );
}
