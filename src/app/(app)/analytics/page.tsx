'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { HubContainer } from '@/components/layout/HubContainer';
import { formatDuration } from '@/lib/hooks/useTaskTimer';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface AnalyticsData {
  avgEfficiency: number | null;
  completionRate: number | null;
  totalFocusMs: number;
  trends: { date: string; value: number }[];
  topFlows: {
    id: string;
    title: string;
    efficiency_score: number;
    actual_ms: number;
    completed_at: string;
  }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7' | '30' | 'all'>('30');
  const [chartView, setChartView] = useState<'daily' | 'weekly'>('daily');

  useEffect(() => {
    async function fetchAnalytics() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/analytics?days=${dateRange}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAnalytics();
  }, [dateRange]);

  // Aggregate trends based on chartView
  const chartData = useMemo(() => {
    if (!data?.trends) return [];
    if (chartView === 'daily') return data.trends;
    
    // Weekly grouping logic
    const weeklyMap: Record<string, number> = {};
    data.trends.forEach(item => {
      const d = new Date(item.date);
      // Get week start string (approximated by moving to previous Sunday)
      const diff = d.getDate() - d.getDay();
      const weekStart = new Date(d.setDate(diff)).toISOString().split('T')[0];
      weeklyMap[weekStart] = (weeklyMap[weekStart] || 0) + item.value;
    });
    
    return Object.keys(weeklyMap).sort().map(w => ({
      date: w,
      value: weeklyMap[w],
    }));
  }, [data?.trends, chartView]);

  return (
    <HubContainer>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            Analytics
          </h1>
          <p className="text-gray-400">
            Your execution patterns
          </p>
        </div>
        <div className="flex bg-[#121A2F] border border-[#1E293B] rounded-xl p-1 gap-1">
          {(['7', '30', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                dateRange === range 
                  ? 'bg-[#1E293B] text-white shadow-sm' 
                  : 'text-gray-500 hover:text-gray-300 hover:bg-[#1E293B]/50'
              }`}
            >
              {range === 'all' ? 'All Time' : `${range} Days`}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
         <div className="text-center text-gray-500 p-10">Failed to load analytics.</div>
      ) : (
        <div className="space-y-6">
          {/* ─── KPI Row ─── */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
            
            {/* Efficiency Card (Primary - Wide) */}
            <div className="md:col-span-6 bg-[#161D2C] border border-[#1E293B] rounded-2xl p-8 relative overflow-hidden flex flex-col justify-between group">
              {/* Bottom gradient line matching design */}
              <div className="absolute bottom-6 left-8 right-8 h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full" />
              
              <div>
                <p className="text-[10px] font-bold tracking-[0.18em] text-gray-500 uppercase mb-3 text-blue-300">KEY METRIC</p>
                <h2 className="text-2xl font-bold text-white mb-6">Efficiency</h2>
              </div>
              <div className="flex items-end gap-4 mb-4">
                <div className="flex items-baseline">
                  <span className="text-7xl font-bold text-white tracking-tighter leading-none">
                    {data.avgEfficiency !== null ? data.avgEfficiency : '—'}
                  </span>
                  <span className="text-2xl font-bold text-gray-400 ml-1 mb-1">%</span>
                </div>
                {/* Fake trend indicator relative to previous period might be untruthful, but let's show an absolute qualitative marker if valid */}
                {data.avgEfficiency !== null && data.avgEfficiency >= 100 && (
                   <span className="mb-2 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md text-xs font-bold flex items-center gap-1 border border-emerald-500/20">
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
                     On Pace
                   </span>
                )}
              </div>
            </div>

            {/* Completion Card */}
            <div className="md:col-span-3 bg-[#161D2C] border border-[#1E293B] rounded-2xl p-8 flex flex-col items-center justify-center relative">
              <div className="w-full h-full flex flex-col items-start">
                <p className="text-[10px] font-bold tracking-[0.18em] text-gray-500 uppercase mb-3">COMPLETION</p>
                <p className="text-4xl font-bold text-white mb-1">{data.completionRate !== null ? `${data.completionRate}%` : '—'}</p>
                <p className="text-xs text-gray-500 mb-6">Execution confidence</p>
                {/* Donut Chart visual representation */}
                <div className="self-center mt-auto">
                   <svg width="80" height="80" viewBox="0 0 100 100" className="transform -rotate-90">
                     <circle cx="50" cy="50" r="40" stroke="#1E293B" strokeWidth="8" fill="none" />
                     {data.completionRate !== null && (
                       <circle 
                         cx="50" cy="50" r="40" 
                         stroke="#FBAA75" strokeWidth="8" fill="none" 
                         strokeDasharray={`${(data.completionRate / 100) * 251.2} 251.2`} 
                         strokeLinecap="round" 
                       />
                     )}
                   </svg>
                </div>
              </div>
            </div>

            {/* Focus Time Card */}
            <div className="md:col-span-3 bg-[#161D2C] border border-[#1E293B] rounded-2xl p-8">
               <p className="text-[10px] font-bold tracking-[0.18em] text-gray-500 uppercase mb-3">FOCUS TIME</p>
               <p className="text-4xl font-bold text-white tracking-tight mb-1">
                 {data.totalFocusMs > 0 ? (
                    // Strip seconds, format to h / m
                    formatDuration(data.totalFocusMs).replace(/(\d+)s/, '').trim()
                 ) : '—'}
               </p>
               <p className="text-xs text-gray-500 mb-8">Total recorded execution</p>
               
               {/* Small bar chart graphic (static illustration for aesthetic) */}
               <div className="flex items-end gap-1.5 h-16 opacity-70">
                 {[40, 60, 30, 80, 50, 90, 70].map((h, i) => (
                   <div key={i} className="flex-1 bg-blue-300 rounded-sm" style={{ height: `${h}%`, opacity: 0.2 + (i*0.1) }} />
                 ))}
               </div>
            </div>
          </div>

          {/* ─── Execution Trends Chart ─── */}
          <div className="bg-[#161D2C] border border-[#1E293B] rounded-2xl p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Execution Trends</h3>
                <p className="text-xs text-gray-500">Flow completion volume over selected period</p>
              </div>
              <div className="flex bg-[#121A2F] border border-[#1E293B] rounded-lg overflow-hidden">
                <button 
                  onClick={() => setChartView('daily')}
                  className={`px-4 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-colors ${chartView === 'daily' ? 'bg-[#283548] text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  DAILY
                </button>
                <button 
                   onClick={() => setChartView('weekly')}
                   className={`px-4 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-colors ${chartView === 'weekly' ? 'bg-[#283548] text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  WEEKLY
                </button>
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              {chartData.length > 0 && chartData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#60A5FA" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      stroke="#475569" 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickFormatter={(val) => {
                         const d = new Date(val);
                         return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis 
                      stroke="#475569" 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickCount={4}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px', padding: '12px', color: '#fff' }}
                      itemStyle={{ color: '#60A5FA', fontWeight: 'bold' }}
                      labelStyle={{ color: '#94A3B8', fontSize: '12px', marginBottom: '4px' }}
                      formatter={(val) => [`${val || 0} actions`, 'Execution']}
                      labelFormatter={(val) => new Date(val).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#818CF8" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-[#1E293B] rounded-xl text-gray-500">
                   <p className="text-sm">No execution data in this period.</p>
                </div>
              )}
            </div>
          </div>

          {/* ─── Top Performing Flows ─── */}
          <div className="bg-[#161D2C] border border-[#1E293B] rounded-2xl overflow-hidden mt-6">
             <div className="flex items-center justify-between p-6 border-b border-[#1E293B]">
               <h3 className="text-lg font-bold text-white">Top Performing Flows</h3>
               <button className="text-[10px] font-bold tracking-wider text-gray-400 uppercase hover:text-white transition-colors flex items-center gap-1">
                 FULL REPORT <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
               </button>
             </div>
             
             {data.topFlows.length > 0 ? (
               <div className="divide-y divide-[#1E293B]">
                 {data.topFlows.map((flow) => (
                   <div key={flow.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 hover:bg-[#1E293B]/20 transition-colors">
                     <div className="flex items-center gap-4 mb-4 md:mb-0">
                       <div className="w-12 h-12 rounded-xl bg-[#1E293B]/50 border border-[#334155]/30 flex items-center justify-center flex-shrink-0 text-blue-400">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                             {/* Rocket icon approximation */}
                             <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2l6.5-6.5a2.12 2.12 0 0 0-3-3l-6.5 6.5Z"/>
                             <path d="m15.5 8.5 3-3a2.12 2.12 0 0 0-3-3l-3 3"/>
                          </svg>
                       </div>
                       <div>
                         <h4 className="text-sm font-bold text-white">{flow.title}</h4>
                         <p className="text-xs text-gray-500 mt-1">
                           Completed {new Date(flow.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                         </p>
                       </div>
                     </div>
                     <div className="flex items-center gap-12 w-full md:w-auto justify-between md:justify-end">
                       <div className="text-right">
                         <p className="text-[10px] font-bold tracking-wider text-gray-500 uppercase mb-1">SCORE</p>
                         <p className="text-xl font-bold text-white">{flow.efficiency_score}</p>
                       </div>
                       <div className="text-right">
                         <p className="text-[10px] font-bold tracking-wider text-gray-500 uppercase mb-1">FOCUS TIME</p>
                         <p className="text-sm font-semibold text-white mt-1">
                            {formatDuration(flow.actual_ms).replace(/(\d+)s/, '').trim()}
                         </p>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="p-12 text-center border-t border-[#1E293B]">
                 <p className="text-sm text-gray-500">No completed flows yet to rank.</p>
               </div>
             )}
          </div>

        </div>
      )}
    </HubContainer>
  );
}
