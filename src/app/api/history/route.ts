import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { Node } from '@/types/database';

export interface SyntheticEvent {
  id: string; // Unique surrogate ID for the list
  event_type: string;
  timestamp: string;
  flow_id: string;
  flow_title: string;
  flow_status: string;
  flow_source: string | null;
  node_title?: string;
}

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: flows, error: flowsError } = await supabase
      .from('flows')
      .select('*')
      .eq('user_id', session.user.id);

    if (flowsError) throw flowsError;

    const flowIds = (flows || []).map((f) => f.id);
    let nodes: Node[] = [];
    
    if (flowIds.length > 0) {
      const { data: n } = await supabase
        .from('nodes')
        .select('*')
        .in('flow_id', flowIds);
      nodes = n || [];
    }

    const events: SyntheticEvent[] = [];

    (flows || []).forEach((flow) => {
      // Flow Created
      if (flow.created_at) {
        events.push({
          id: `fc_${flow.id}`,
          event_type: 'flow_created',
          timestamp: flow.created_at,
          flow_id: flow.id,
          flow_title: flow.title,
          flow_status: flow.status,
          flow_source: flow.source,
        });
      }
      
      // Flow Started
      if (flow.started_at) {
        events.push({
          id: `fs_${flow.id}`,
          event_type: 'flow_started',
          timestamp: flow.started_at,
          flow_id: flow.id,
          flow_title: flow.title,
          flow_status: flow.status,
          flow_source: flow.source,
        });
      }

      // Flow Completed
      if (flow.completed_at && flow.status === 'completed') {
        events.push({
          id: `fcmp_${flow.id}`,
          event_type: 'flow_completed',
          timestamp: flow.completed_at,
          flow_id: flow.id,
          flow_title: flow.title,
          flow_status: flow.status,
          flow_source: flow.source,
        });
      }

      // Flow Abandoned
      if (flow.status === 'abandoned') {
        events.push({
          id: `fab_${flow.id}`,
          event_type: 'flow_abandoned',
          timestamp: flow.updated_at,
          flow_id: flow.id,
          flow_title: flow.title,
          flow_status: flow.status,
          flow_source: flow.source,
        });
      }
    });

    (nodes || []).forEach((node) => {
      const parentFlow = flows?.find(f => f.id === node.flow_id);
      if (!parentFlow) return;

      // Task Started
      if (node.started_at) {
        events.push({
          id: `ts_${node.id}`,
          event_type: 'task_started',
          timestamp: node.started_at,
          flow_id: parentFlow.id,
          flow_title: parentFlow.title,
          flow_status: parentFlow.status,
          flow_source: parentFlow.source,
          node_title: node.title,
        });
      }

      // Task Completed
      if (node.completed_at && node.status === 'completed') {
        events.push({
          id: `tcmp_${node.id}`,
          event_type: 'task_completed',
          timestamp: node.completed_at,
          flow_id: parentFlow.id,
          flow_title: parentFlow.title,
          flow_status: parentFlow.status,
          flow_source: parentFlow.source,
          node_title: node.title,
        });
      }
    });

    // Sort descending chronologically
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Basic summary counts to avoid extra logic on frontend:
    const activeFlows = (flows || []).filter(f => f.status === 'active' || f.status === 'review');
    const completedFlows = (flows || []).filter(f => f.status === 'completed');
    
    // Sort flows by updated_at descending to find most active
    const mostActiveFlow = [...activeFlows].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];

    return NextResponse.json({
      success: true,
      data: {
        events,
        summary: {
          activeCount: activeFlows.length,
          completedCount: completedFlows.length,
          mostActiveFlowTitle: mostActiveFlow ? mostActiveFlow.title : null
        }
      }
    });

  } catch (error: unknown) {
    console.error('History API Error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
