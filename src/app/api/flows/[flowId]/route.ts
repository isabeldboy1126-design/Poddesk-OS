import { NextRequest, NextResponse } from 'next/server';
import { generateFlow } from '@/lib/ai/gemini';
import { GenerateRequest } from '@/lib/ai/types';
import { createServerClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function GET(
  req: NextRequest,
  { params }: { params: { flowId: string } }
) {
  try {
    const supabase = await createServerClient();
    const { flowId } = params;

    // Fetch Flow
    const { data: flow, error: flowError } = await supabase
      .from('flows')
      .select('*')
      .eq('id', flowId)
      .single();

    if (flowError) throw flowError;
    if (!flow) return NextResponse.json({ error: 'Flow not found' }, { status: 404 });

    // Fetch Nodes
    const { data: nodes, error: nodesError } = await supabase
      .from('nodes')
      .select('*')
      .eq('flow_id', flowId)
      .order('order_index', { ascending: true });

    if (nodesError) throw nodesError;

    return NextResponse.json({ flow, nodes });
  } catch (error: unknown) {
    console.error('Fetch Flow API Error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { flowId: string } }
) {
  try {
    const { flowId } = params;
    const body: GenerateRequest = await req.json();
    const { added_context, generation_mode, ai_intensity, context } = body;

    const supabase = await createServerClient();

    // 1. Fetch current flow to get original raw_input AND source
    const { data: existingFlow, error: fetchError } = await supabase
      .from('flows')
      .select('raw_input, source, generation_mode')
      .eq('id', flowId)
      .single();

    if (fetchError || !existingFlow) {
      return NextResponse.json({ error: 'Flow not found for regeneration' }, { status: 404 });
    }

    // Use the stored source from the original flow, not a hardcoded value
    const flowSource = existingFlow.source || 'brain_dump';
    const flowMode = generation_mode || existingFlow.generation_mode || 'ai_enhancement';

    // 2. Call AI Generation (includes added_context merged with original intent)
    const { output, validationErrors } = await generateFlow({
      input: existingFlow.raw_input,
      added_context: added_context || '',
      source: flowSource as 'brain_dump' | 'existing_plan',
      generation_mode: flowMode as 'exact_tracking' | 'ai_enhancement',
      ai_intensity,
      context,
    });

    if (output.clarification_needed) {
       return NextResponse.json({
        success: true,
        clarification_needed: true,
        clarification_questions: output.clarification_questions || [],
        interpretation_summary: output.interpretation_summary || null,
      });
    }

    if (validationErrors && validationErrors.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Regeneration failed validation.',
        validation_errors: validationErrors 
      }, { status: 422 });
    }

    // 3. Update Existing Flow & Replace Nodes (No duplicate flows)
    
    // Deleting old nodes
    const { error: deleteError } = await supabase
      .from('nodes')
      .delete()
      .eq('flow_id', flowId);

    if (deleteError) throw deleteError;

    // Update flow metadata
    const { error: updateError } = await supabase
      .from('flows')
      .update({
        title: output.flow_title,
        ai_confidence: output.confidence,
        detected_goal: output.detected_goal,
        task_count: output.tasks.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', flowId);

    if (updateError) throw updateError;

    // Create new nodes
    const nodes = output.tasks.map((task) => ({
      id: uuidv4(),
      flow_id: flowId,
      order_index: task.order_index,
      title: task.title,
      description: task.description,
      done_definition: task.done_definition,
      milestone: task.milestone,
      status: 'locked',
      provenance: task.provenance,
      estimated_duration_ms: task.estimated_duration_minutes * 60 * 1000,
    }));

    const { error: nodesError } = await supabase.from('nodes').insert(nodes);

    if (nodesError) throw nodesError;

    return NextResponse.json({ 
      success: true, 
      flow_id: flowId,
      generation: output 
    });

  } catch (error: unknown) {
    console.error('Regeneration API Error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── PATCH: Flow-level execution mutations ───
type FlowAction = 'start_execution' | 'pause_execution' | 'abandon' | 'attach';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { flowId: string } }
) {
  try {
    const { flowId } = params;
    const body = await req.json();
    const action: FlowAction = body.action;

    if (!['start_execution', 'pause_execution', 'abandon', 'attach'].includes(action)) {
      return NextResponse.json(
        { error: `Invalid flow action: ${action}` },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const now = new Date().toISOString();

    // Fetch flow
    const { data: flow, error: flowError } = await supabase
      .from('flows')
      .select('*')
      .eq('id', flowId)
      .single();

    if (flowError || !flow) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
    }

    // ─── START EXECUTION ───
    if (action === 'start_execution') {
      if (flow.status !== 'review') {
        return NextResponse.json(
          { error: 'Can only start execution from review status' },
          { status: 409 }
        );
      }

      // Activate the first node
      const { data: nodes } = await supabase
        .from('nodes')
        .select('*')
        .eq('flow_id', flowId)
        .order('order_index', { ascending: true });

      if (!nodes || nodes.length === 0) {
        return NextResponse.json(
          { error: 'Flow has no tasks' },
          { status: 400 }
        );
      }

      const firstNode = nodes[0];

      // Activate first node
      await supabase
        .from('nodes')
        .update({
          status: 'active',
          started_at: now,
          last_resumed_at: now,
        })
        .eq('id', firstNode.id);

      // Set flow to active
      await supabase
        .from('flows')
        .update({
          status: 'active',
          started_at: now,
          updated_at: now,
        })
        .eq('id', flowId);

      return NextResponse.json({
        success: true,
        action: 'start_execution',
        active_node_id: firstNode.id,
      });
    }

    // ─── PAUSE EXECUTION ───
    if (action === 'pause_execution') {
      if (flow.status !== 'active') {
        return NextResponse.json(
          { error: 'Can only pause an active flow' },
          { status: 409 }
        );
      }

      // Find the currently active node and pause it
      const { data: activeNode } = await supabase
        .from('nodes')
        .select('*')
        .eq('flow_id', flowId)
        .eq('status', 'active')
        .single();

      if (activeNode && activeNode.last_resumed_at) {
        const additionalMs = Math.max(
          0,
          new Date(now).getTime() -
            new Date(activeNode.last_resumed_at).getTime()
        );
        const newAccumulated =
          (activeNode.accumulated_duration_ms || 0) + additionalMs;

        await supabase
          .from('nodes')
          .update({
            accumulated_duration_ms: newAccumulated,
            last_resumed_at: null,
          })
          .eq('id', activeNode.id);
      }

      // Flow stays 'active' — it's just paused at the node level
      // The presence/absence of last_resumed_at on the active node signals pause state
      await supabase
        .from('flows')
        .update({ updated_at: now })
        .eq('id', flowId);

      return NextResponse.json({
        success: true,
        action: 'pause_execution',
      });
    }

    // ─── ATTACH FLOW (AUTH) ───
    if (action === 'attach') {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        return NextResponse.json(
          { error: 'Unauthorized. Must be logged in to attach flow.' },
          { status: 401 }
        );
      }

      if (flow.user_id && flow.user_id !== session.user.id) {
        return NextResponse.json(
          { error: 'Flow already belongs to another user' },
          { status: 403 }
        );
      }

      // If already belongs to this user, do nothing but return success
      if (flow.user_id === session.user.id) {
        return NextResponse.json({ success: true, action: 'attach' });
      }

      // Ensure user exists in public.users to satisfy flows_user_id_fkey
      await supabase.from('users').upsert({
        id: session.user.id,
        email: session.user.email,
        onboarding_done: true
      }, { onConflict: 'id' });

      // Claim anonymous flow
      await supabase
        .from('flows')
        .update({
          user_id: session.user.id,
          updated_at: now,
        })
        .eq('id', flowId);

      return NextResponse.json({
        success: true,
        action: 'attach',
        user_id: session.user.id,
      });
    }

    // ─── ABANDON ───
    if (action === 'abandon') {
      // Pause active node first if running
      const { data: activeNode } = await supabase
        .from('nodes')
        .select('*')
        .eq('flow_id', flowId)
        .eq('status', 'active')
        .single();

      if (activeNode && activeNode.last_resumed_at) {
        const additionalMs = Math.max(
          0,
          new Date(now).getTime() -
            new Date(activeNode.last_resumed_at).getTime()
        );
        await supabase
          .from('nodes')
          .update({
            accumulated_duration_ms:
              (activeNode.accumulated_duration_ms || 0) + additionalMs,
            last_resumed_at: null,
          })
          .eq('id', activeNode.id);
      }

      await supabase
        .from('flows')
        .update({
          status: 'abandoned',
          updated_at: now,
        })
        .eq('id', flowId);

      return NextResponse.json({
        success: true,
        action: 'abandon',
      });
    }

    return NextResponse.json({ error: 'Unhandled action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Flow PATCH Error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
