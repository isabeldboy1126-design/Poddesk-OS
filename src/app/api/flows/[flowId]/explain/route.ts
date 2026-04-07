import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AI === 'true';

type UnstuckBlockType =
  | 'none'
  | 'dont_know_how_to_start'
  | 'waiting_on_something'
  | 'task_feels_too_big';

interface UnstuckResponse {
  what_is_blocking_you: string;
  do_this_now: string;
  smallest_possible_step: string;
  avoid_this: string;
  done_looks_like: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { flowId: string } }
) {
  try {
    const { flowId } = params;
    const body = await request.json();
    const { nodeId, mode, userBlockType, userContext } = body as {
      nodeId?: string;
      mode?: 'explain' | 'unstuck_v2';
      userBlockType?: UnstuckBlockType;
      userContext?: string;
    };

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

    // ─── Get Unstuck v2 mode ───
    if (mode === 'unstuck_v2') {
      const validBlockType: UnstuckBlockType =
        userBlockType === 'dont_know_how_to_start' ||
        userBlockType === 'waiting_on_something' ||
        userBlockType === 'task_feels_too_big'
          ? userBlockType
          : 'none';

      const { data: flow } = await supabase
        .from('flows')
        .select('title')
        .eq('id', flowId)
        .single();

      if (USE_MOCK) {
        return NextResponse.json(
          generateMockUnstuck(
            node.title,
            node.description,
            node.done_definition,
            validBlockType,
            userContext || ''
          )
        );
      }

      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return NextResponse.json(
            { error: 'GEMINI_API_KEY is not set on the server.' },
            { status: 500 }
          );
        }

        const client = new GoogleGenerativeAI(apiKey);
        const model = client.getGenerativeModel({
          model: 'gemini-2.5-flash',
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 700,
            responseMimeType: 'application/json',
          },
        });

        const contextPayload = {
          flow_title: flow?.title || 'Untitled flow',
          task_title: node.title,
          task_description: node.description || 'No description provided',
          done_definition: node.done_definition || 'No done definition provided',
          milestone: node.milestone || 'No milestone provided',
          estimated_duration_minutes: Math.round((node.estimated_duration_ms || 0) / 60000) || null,
          userBlockType: validBlockType,
          userContext: userContext?.trim() || null,
        };

        const result = await model.generateContent([
          {
            text: `You are Poddesk's execution recovery engine.

Your job is to help a user get unstuck on their current task without overwhelming them.

You must:
- be short
- be practical
- be specific to the current task
- reduce hesitation
- lower the activation barrier
- preserve the task's real objective
- avoid generic productivity advice
- avoid motivational fluff
- avoid suggesting major replanning unless absolutely necessary

Return help in this structured form:
1. what_is_blocking_you - a short diagnosis
2. do_this_now
3. smallest_possible_step
4. avoid_this
5. done_looks_like

Rules:
- every answer must be grounded in the actual task context
- do not invent unrelated work
- do not give multiple competing strategies
- give one immediate path forward
- if the task is too vague, tighten it
- if the task feels too large, shrink the entry point
- if the user seems blocked by uncertainty, turn uncertainty into one concrete action
- if the user is waiting on something external, suggest the most useful immediate preparatory action without pretending the dependency is resolved

Return ONLY valid JSON in this exact schema:
{
  "what_is_blocking_you": "...",
  "do_this_now": "...",
  "smallest_possible_step": "...",
  "avoid_this": "...",
  "done_looks_like": "..."
}`,
          },
          {
            text: `TASK_CONTEXT_JSON:\n${JSON.stringify(contextPayload, null, 2)}`,
          },
        ]);

        const raw = result.response.text();
        const parsed = parseUnstuckResponse(raw);

        if (!parsed) {
          return NextResponse.json(
            {
              error: 'Malformed AI output for Get Unstuck v2.',
              details: `Could not parse strict schema from model output. Raw preview: ${raw.slice(0, 320)}`,
            },
            { status: 502 }
          );
        }

        return NextResponse.json(parsed);
      } catch (unstuckErr) {
        console.error('Get Unstuck v2 API Error:', unstuckErr);
        return NextResponse.json(
          { error: 'Get Unstuck v2 request failed.', details: (unstuckErr as Error).message || 'Unknown error' },
          { status: 500 }
        );
      }
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
        model: 'gemini-2.5-flash',
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

function parseUnstuckResponse(raw: string): UnstuckResponse | null {
  try {
    const cleaned = raw
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    const candidate = start !== -1 && end > start ? cleaned.slice(start, end + 1) : cleaned;

    const data = JSON.parse(candidate) as Partial<UnstuckResponse>;

    const fields: Array<keyof UnstuckResponse> = [
      'what_is_blocking_you',
      'do_this_now',
      'smallest_possible_step',
      'avoid_this',
      'done_looks_like',
    ];

    for (const field of fields) {
      if (typeof data[field] !== 'string' || data[field]!.trim().length === 0) {
        return null;
      }
    }

    return {
      what_is_blocking_you: data.what_is_blocking_you!.trim(),
      do_this_now: data.do_this_now!.trim(),
      smallest_possible_step: data.smallest_possible_step!.trim(),
      avoid_this: data.avoid_this!.trim(),
      done_looks_like: data.done_looks_like!.trim(),
    };
  } catch {
    return null;
  }
}

function generateMockUnstuck(
  title: string,
  description: string | null,
  doneDefinition: string | null,
  userBlockType: UnstuckBlockType,
  userContext: string
): UnstuckResponse {
  const blockMap: Record<UnstuckBlockType, string> = {
    none: 'You are hesitating at the start point and need a tighter first move.',
    dont_know_how_to_start: 'The task is clear, but the starting action is undefined.',
    waiting_on_something: 'An external dependency is slowing execution momentum.',
    task_feels_too_big: 'The task scope feels too large to begin confidently.',
  };

  const contextTail = userContext.trim() ? ` Context noted: ${userContext.trim()}.` : '';

  return {
    what_is_blocking_you: `${blockMap[userBlockType]}${contextTail}`,
    do_this_now: `Create one concrete action for "${title}" and execute it in under 10 minutes.`,
    smallest_possible_step: `Open the working surface and write a first draft line based on: ${description || title}.`,
    avoid_this: 'Avoid rewriting the full plan or opening unrelated tasks before this first move is done.',
    done_looks_like: doneDefinition || 'One concrete artifact is produced that clearly advances this task.',
  };
}
