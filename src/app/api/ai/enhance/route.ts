import { NextRequest, NextResponse } from 'next/server';
import { enhancePrompt } from '@/lib/ai/gemini';
import { EnhanceRequest } from '@/lib/ai/types';

export async function POST(req: NextRequest) {
  try {
    const body: EnhanceRequest = await req.json();
    const { text, mode } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const enhancedText = await enhancePrompt(text, mode);

    return NextResponse.json({ enhanced_text: enhancedText });
  } catch (error: unknown) {
    console.error('Enhancement API Error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
