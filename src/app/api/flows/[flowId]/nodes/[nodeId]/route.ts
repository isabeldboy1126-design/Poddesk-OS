import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

type NodeAction = 'start' | 'complete' | 'pause' | 'resume';

export async function POST(
  request: NextRequest,
  { params }: { params: { flowId: string; nodeId: string } }
) {
  try {
    const { flowId, nodeId } = params;
    const body = await request.json();
    const action: NodeAction = body.action;

    if (!['start', 'complete', 'pause', 'resume'].includes(action)) {
      return NextResponse.json(
        { error: `Invalid action: ${action}` },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Fetch the target node
    const { data: node, error: nodeError } = await supabase
      .from('nodes')
      .select('*')
      .eq('id', nodeId)
      .eq('flow_id', flowId)
      .single();

    if (nodeError || !node) {
      return NextResponse.json(
        { error: 'Node not found in this flow' },
        { status: 404 }
      );
    }

    // Fetch flow for context
    const { data: flow, error: flowError } = await supabase
      .from('flows')
      .select('*')
      .eq('id', flowId)
      .single();

    if (flowError || !flow) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // ─── START ───
    if (action === 'start') {
      // Only the first node in a review/active flow can be started
      if (node.status !== 'locked') {
        return NextResponse.json(
          { error: 'Node is not in locked status' },
          { status: 409 }
        );
      }

      // Verify this is the first locked node (sequentially)
      const { data: allNodes } = await supabase
        .from('nodes')
        .select('id, order_index, status')
        .eq('flow_id', flowId)
        .order('order_index', { ascending: true });

      const firstLocked = allNodes?.find((n) => n.status === 'locked');
      if (!firstLocked || firstLocked.id !== nodeId) {
        return NextResponse.json(
          { error: 'Can only start the next sequential task' },
          { status: 409 }
        );
      }

      // Activate the node
      const { error: updateError } = await supabase
        .from('nodes')
        .update({
          status: 'active',
          started_at: now,
          last_resumed_at: now,
        })
        .eq('id', nodeId);

      if (updateError) throw updateError;

      // Set flow to active if not already
      if (flow.status === 'review') {
        await supabase
          .from('flows')
          .update({ status: 'active', started_at: now, updated_at: now })
          .eq('id', flowId);
      }

      return NextResponse.json({
        success: true,
        action: 'start',
        node_id: nodeId,
      });
    }

    // ─── PAUSE ───
    if (action === 'pause') {
      if (node.status !== 'active') {
        return NextResponse.json(
          { error: 'Can only pause an active node' },
          { status: 409 }
        );
      }

      // Calculate elapsed since last resume
      let additionalMs = 0;
      if (node.last_resumed_at) {
        additionalMs = Math.max(
          0,
          new Date(now).getTime() - new Date(node.last_resumed_at).getTime()
        );
      }

      const newAccumulated = (node.accumulated_duration_ms || 0) + additionalMs;

      const { error: updateError } = await supabase
        .from('nodes')
        .update({
          accumulated_duration_ms: newAccumulated,
          last_resumed_at: null, // Clears to signal paused
        })
        .eq('id', nodeId);

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        action: 'pause',
        node_id: nodeId,
        accumulated_duration_ms: newAccumulated,
      });
    }

    // ─── RESUME ───
    if (action === 'resume') {
      if (node.status !== 'active') {
        return NextResponse.json(
          { error: 'Can only resume an active node' },
          { status: 409 }
        );
      }

      // If already has last_resumed_at, it's already running — idempotent
      if (node.last_resumed_at) {
        return NextResponse.json({
          success: true,
          action: 'resume',
          node_id: nodeId,
          already_running: true,
        });
      }

      const { error: updateError } = await supabase
        .from('nodes')
        .update({ last_resumed_at: now })
        .eq('id', nodeId);

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        action: 'resume',
        node_id: nodeId,
      });
    }

    // ─── COMPLETE ───
    if (action === 'complete') {
      // Idempotent: if already completed, return success
      if (node.status === 'completed') {
        return NextResponse.json({
          success: true,
          action: 'complete',
          node_id: nodeId,
          already_completed: true,
        });
      }

      if (node.status !== 'active') {
        return NextResponse.json(
          { error: 'Can only complete an active node' },
          { status: 409 }
        );
      }

      // Verify sequential ordering — all prior nodes must be completed
      const { data: allNodes } = await supabase
        .from('nodes')
        .select('id, order_index, status')
        .eq('flow_id', flowId)
        .order('order_index', { ascending: true });

      const priorIncomplete = allNodes?.find(
        (n) => n.order_index < node.order_index && n.status !== 'completed'
      );

      if (priorIncomplete) {
        return NextResponse.json(
          { error: 'Cannot complete out of sequence — prior tasks incomplete' },
          { status: 409 }
        );
      }

      // Calculate final accumulated duration
      let additionalMs = 0;
      if (node.last_resumed_at) {
        additionalMs = Math.max(
          0,
          new Date(now).getTime() - new Date(node.last_resumed_at).getTime()
        );
      }
      const finalAccumulated =
        (node.accumulated_duration_ms || 0) + additionalMs;

      // Complete the node
      const { error: completeError } = await supabase
        .from('nodes')
        .update({
          status: 'completed',
          completed_at: now,
          accumulated_duration_ms: finalAccumulated,
          last_resumed_at: null,
        })
        .eq('id', nodeId);

      if (completeError) throw completeError;

      // Check for next node — find first with order_index > current (gap-safe)
      const nextNode = allNodes?.find(
        (n) => n.order_index > node.order_index && n.status !== 'completed'
      );

      let flowCompleted = false;

      if (nextNode) {
        // Activate next node
        await supabase
          .from('nodes')
          .update({
            status: 'active',
            started_at: now,
            last_resumed_at: now,
          })
          .eq('id', nextNode.id);
      } else {
        // No more nodes — flow is complete
        flowCompleted = true;

        // Calculate total actual time
        const { data: completedNodes } = await supabase
          .from('nodes')
          .select('accumulated_duration_ms')
          .eq('flow_id', flowId);

        const totalActualMs = (completedNodes || []).reduce(
          (sum, n) => sum + (n.accumulated_duration_ms || 0),
          0
        );

        await supabase
          .from('flows')
          .update({
            status: 'completed',
            completed_at: now,
            total_actual_ms: totalActualMs,
            updated_at: now,
          })
          .eq('id', flowId);
      }

      return NextResponse.json({
        success: true,
        action: 'complete',
        node_id: nodeId,
        accumulated_duration_ms: finalAccumulated,
        flow_completed: flowCompleted,
        next_node_id: nextNode?.id || null,
      });
    }

    return NextResponse.json({ error: 'Unhandled action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Node Mutation API Error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
