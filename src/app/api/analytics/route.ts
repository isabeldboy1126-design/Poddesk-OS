import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { Flow, Node } from '@/types/database';

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('days') || 'all'; // '7', '30', 'all'

    // Calculate cutoff date cleanly
    let cutoff: Date | null = null;
    if (range === '7') {
      cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
    } else if (range === '30') {
      cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
    }

    const query = supabase
      .from('flows')
      .select('*')
      .eq('user_id', session.user.id);
    
    // Do not filter main query by date entirely, because we want overall focus time and completion context?
    // Wait, typical analytics filters usually filter ALL metric cards to the selected date range.
    // We will filter by created_at or updated_at.
    if (cutoff) {
      query.gte('created_at', cutoff.toISOString());
    }

    const { data: flows, error: flowsError } = await query;

    if (flowsError) throw flowsError;

    const flowIds = (flows || []).map((f) => f.id);
    const nodesMap: Record<string, Node[]> = {};
    
    if (flowIds.length > 0) {
      const { data: nodes } = await supabase
        .from('nodes')
        .select('*')
        .in('flow_id', flowIds);
        
      (nodes || []).forEach(n => {
        if (!nodesMap[n.flow_id]) nodesMap[n.flow_id] = [];
        nodesMap[n.flow_id].push(n);
      });
    }

    const enrichedFlows = (flows || []).map(f => ({ ...f, nodes: nodesMap[f.id] || [] }));

    // ─── Derivations ───
    const activeFlows: string[] = [];
    const completedFlows: string[] = [];
    const abandonedFlows: string[] = [];

    let totalFocusMs = 0;

    const completedWithEfficiency: { flow: Flow, actual: number, est: number, score: number }[] = [];

    enrichedFlows.forEach((flow) => {
      // Classification matching Dashboard rules
      if (flow.status === 'completed') completedFlows.push(flow.id);
      else if (flow.status === 'active' || flow.status === 'review') activeFlows.push(flow.id);
      else if (flow.status === 'abandoned') abandonedFlows.push(flow.id);

      // Focus Time
      const actualMs = (flow.nodes || [])
        .filter((n: Node) => n.status === 'completed')
        .reduce((sum: number, n: Node) => sum + (n.accumulated_duration_ms || 0), 0);
      totalFocusMs += actualMs;

      // Efficiency for completed flows
      if (flow.status === 'completed') {
        const estMs = (flow.nodes || []).reduce((sum: number, n: Node) => sum + (n.estimated_duration_ms || 0), 0);
        if (actualMs > 0 && estMs > 0) {
          const score = Math.round((estMs / actualMs) * 100);
          completedWithEfficiency.push({ flow, actual: actualMs, est: estMs, score });
        }
      }
    });

    // ─── KPIs ───
    const lockedCount = activeFlows.length + completedFlows.length + abandonedFlows.length;
    const completionRate = lockedCount > 0 ? Math.round((completedFlows.length / lockedCount) * 100) : null;
    const avgEfficiency = completedWithEfficiency.length > 0
      ? Math.round(completedWithEfficiency.reduce((acc, f) => acc + f.score, 0) / completedWithEfficiency.length)
      : null;

    // ─── Trends Chart Data ───
    // We group completed flows by day to show execution trend
    const trendsMap: Record<string, number> = {};
    
    // Pre-fill days to avoid gaps
    if (cutoff) {
      for (let d = new Date(cutoff); d <= new Date(); d.setDate(d.getDate() + 1)) {
        trendsMap[d.toISOString().split('T')[0]] = 0;
      }
    }

    completedWithEfficiency.forEach(item => {
      if (item.flow.completed_at) {
        const day = item.flow.completed_at.split('T')[0];
        if (trendsMap[day] !== undefined || !cutoff) {
          trendsMap[day] = (trendsMap[day] || 0) + 1; // Alternatively, sum of completed tasks or focus time
        }
      }
    });

    const trends = Object.keys(trendsMap).sort().map(date => ({
      date,
      value: trendsMap[date]
    }));

    // ─── Top Performing Flows ───
    const topFlows = completedWithEfficiency
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => ({
        id: item.flow.id,
        title: item.flow.title,
        efficiency_score: item.score,
        actual_ms: item.actual,
        completed_at: item.flow.completed_at
      }));

    return NextResponse.json({
      success: true,
      data: {
        avgEfficiency,
        completionRate,
        totalFocusMs,
        trends,
        topFlows
      }
    });

  } catch (error: unknown) {
    console.error('Analytics API Error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
