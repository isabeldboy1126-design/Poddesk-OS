import { NextRequest, NextResponse } from 'next/server';
import { generateFlow } from '@/lib/ai/gemini';
import { GenerateRequest } from '@/lib/ai/types';
import { createServerClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

// ─── GET: List flows for the current authenticated user ───
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
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (flowsError) throw flowsError;

    // For each flow, attach the nodes so the dashboard can derive per-flow metrics
    const flowIds = (flows || []).map((f) => f.id);

    const nodesMap: Record<string, import('@/types/database').Node[]> = {};
    if (flowIds.length > 0) {
      const { data: allNodes } = await supabase
        .from('nodes')
        .select('*')
        .in('flow_id', flowIds);
      
      (allNodes || []).forEach((n) => {
        if (!nodesMap[n.flow_id]) nodesMap[n.flow_id] = [];
        nodesMap[n.flow_id].push(n);
      });
    }

    const enriched = (flows || []).map((f) => ({
      ...f,
      nodes: nodesMap[f.id] || [],
    }));

    return NextResponse.json({ flows: enriched });
  } catch (error: unknown) {
    console.error('List Flows API Error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── POST: Create a new flow ───
export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();
    const {
      raw_input,
      enhanced_input,
      source,
      generation_mode,
      ai_intensity,
      context,
      clarification_answers,
    } = body;

    if (!raw_input) {
      return NextResponse.json({ error: 'Raw input is required' }, { status: 400 });
    }

    // Call AI Generation (includes validation and 1 silent retry)
    const { output, validationErrors } = await generateFlow({
      input: enhanced_input || raw_input,
      source,
      generation_mode,
      ai_intensity,
      context,
      clarification_answers,
    });

    // Handle Clarification Needed (Do not persist)
    if (output.clarification_needed) {
      return NextResponse.json({
        success: true,
        clarification_needed: true,
        clarification_questions: output.clarification_questions || [],
        interpretation_summary: output.interpretation_summary || null,
      });
    }

    // Handle validation failure after retry
    if (validationErrors && validationErrors.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Generation failed validation rules after retries.',
        validation_errors: validationErrors 
      }, { status: 422 });
    }

    // Persistence after successful generation + validation
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    // Safety net to ensure public.users has a row for this user to satisfy flows_user_id_fkey
    // This handles local/development edge cases where auth.users trigger might not fire
    if (session) {
      await supabase.from('users').upsert({
        id: session.user.id,
        email: session.user.email,
        onboarding_done: true // fallback default
      }, { onConflict: 'id' });
    }

    // 1. Create Flow
    const flowId = uuidv4();
    const { error: flowError } = await supabase.from('flows').insert({
      id: flowId,
      user_id: session ? session.user.id : null, // Claim flow immediately if authenticated
      title: output.flow_title,
      raw_input: raw_input,
      source: source, // Persist the intake source (brain_dump | existing_plan)
      generation_mode: generation_mode,
      status: 'review',
      ai_confidence: output.confidence,
      detected_goal: output.detected_goal,
      task_count: output.tasks.length,
    });

    if (flowError) throw flowError;

    // 2. Create Nodes
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
    console.error('Flow Generation API Error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
