import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AI === 'true';

export async function POST(
  request: NextRequest,
  { params }: { params: { flowId: string } }
) {
  try {
    const { flowId } = params;
    const body = await request.json();
    const { nodeId } = body;

    if (!nodeId) {
      return NextResponse.json({ error: 'nodeId is required' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Fetch the node
    const { data: node, error: nodeError } = await supabase
      .from('nodes')
      .select('*')
      .eq('id', nodeId)
      .eq('flow_id', flowId)
      .single();

    if (nodeError || !node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // Check cache first
    if (node.ai_explain_cache) {
      return NextResponse.json({
        success: true,
        explanation: node.ai_explain_cache,
        cached: true,
      });
    }

    let explanation: string;

    if (USE_MOCK) {
      // Mock explanation — structured, execution-oriented
      await new Promise((resolve) => setTimeout(resolve, 600));
      explanation = generateMockExplanation(node.title, node.description, node.done_definition);
    } else {
      // Real Gemini call
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('GEMINI_API_KEY not set');

      const client = new GoogleGenerativeAI(apiKey);
      const model = client.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
      });

      const result = await model.generateContent([
        {
          text: `You are a concise execution coach inside a focus-mode productivity tool. The user is working on a specific task and clicked "Explain This Step" because they need quick clarity on what to do.

Give a brief, practical explanation (3-5 sentences max) that:
1. Clarifies what this task actually involves in concrete terms
2. Suggests how to start (first action)
3. Notes what "done" looks like

Be direct, no fluff, no motivational language. Write like a senior engineer briefing a teammate.`,
        },
        {
          text: `Task: ${node.title}\nDescription: ${node.description || 'No additional details'}\nDone when: ${node.done_definition || 'Not specified'}`,
        },
      ]);

      explanation = result.response.text();
    }

    // Cache the explanation
    await supabase
      .from('nodes')
      .update({ ai_explain_cache: explanation })
      .eq('id', nodeId);

    return NextResponse.json({
      success: true,
      explanation,
      cached: false,
    });
  } catch (error: unknown) {
    console.error('Explain API Error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateMockExplanation(
  title: string,
  description: string | null,
  doneDefinition: string | null
): string {
  return `**What this involves:** ${description || title}. This is a focused execution step — don't try to expand scope beyond what's described.

**How to start:** Open the relevant files or tools needed for "${title.toLowerCase()}". Begin with the smallest verifiable action that moves you toward completion.

**You're done when:** ${doneDefinition || 'The task objective is visibly achieved and you can move on without lingering doubt.'}`;
}
