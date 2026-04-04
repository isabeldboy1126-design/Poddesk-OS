import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import {
  BRAIN_DUMP_ENHANCEMENT_PROMPT,
  EXISTING_PLAN_ENHANCEMENT_PROMPT,
  buildBrainDumpGenerationPrompt,
  buildExistingPlanGenerationPrompt,
  buildDocumentExtractionPrompt,
} from './prompts';
import { GenerationOutput } from './types';
import { validateGenerationOutput } from './validator';
import { enhanceMockPrompt, generateMockFlow } from './mock';

// ─────────────────────────────────────────────
// Gemini Client Initialization
// ─────────────────────────────────────────────

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }
  return new GoogleGenerativeAI(apiKey);
}

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AI === 'true';

// ─────────────────────────────────────────────
// PROMPT ENHANCEMENT (returns text, no persistence)
// ─────────────────────────────────────────────

export async function enhancePrompt(
  rawText: string,
  mode: 'brain_dump' | 'existing_plan'
): Promise<string> {
  if (USE_MOCK) {
    return enhanceMockPrompt(rawText, mode);
  }

  const client = getClient();
  const model = client.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.4,
      topP: 0.9,
      maxOutputTokens: 2048,
    },
  });

  const systemPrompt = mode === 'brain_dump'
    ? BRAIN_DUMP_ENHANCEMENT_PROMPT
    : EXISTING_PLAN_ENHANCEMENT_PROMPT;

  const result = await model.generateContent([
    { text: systemPrompt },
    { text: `Here is the user's input to enhance:\n\n${rawText}` },
  ]);

  const response = result.response;
  return response.text();
}

// ─────────────────────────────────────────────
// JSON REPAIR UTILITY (for truncated responses)
// ─────────────────────────────────────────────

function attemptJsonRepair(text: string): string | null {
  // Find the first { to start from
  const startIdx = text.indexOf('{');
  if (startIdx === -1) return null;

  let candidate = text.substring(startIdx);

  // Try as-is first
  try {
    JSON.parse(candidate);
    return candidate;
  } catch { /* needs repair */ }

  // Count open braces/brackets and try to close them
  let inString = false;
  let escapeNext = false;
  let braceDepth = 0;
  let bracketDepth = 0;

  for (let i = 0; i < candidate.length; i++) {
    const ch = candidate[i];
    if (escapeNext) { escapeNext = false; continue; }
    if (ch === '\\' && inString) { escapeNext = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braceDepth++;
    else if (ch === '}') braceDepth--;
    else if (ch === '[') bracketDepth++;
    else if (ch === ']') bracketDepth--;
  }

  // If we're inside a string, close it
  if (inString) candidate += '"';

  // Try trimming trailing comma before closing
  candidate = candidate.replace(/,\s*$/, '');

  // Close open brackets then braces
  while (bracketDepth > 0) { candidate += ']'; bracketDepth--; }
  while (braceDepth > 0) { candidate += '}'; braceDepth--; }

  try {
    JSON.parse(candidate);
    return candidate;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// LARGE DOCUMENT EXTRACTION (Pass 1 for oversized inputs)
// ─────────────────────────────────────────────

// Documents above this character count trigger a two-pass pipeline:
// Pass 1: Extract structured summary from the raw document
// Pass 2: Generate execution flow from the structured summary
const LARGE_INPUT_THRESHOLD = 15000;

async function extractDocumentStructure(
  rawText: string,
  mode: 'exact_tracking' | 'ai_enhancement'
): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.2, // Low temperature for faithful extraction
      topP: 0.9,
      maxOutputTokens: 8192, // Enough room for a thorough extraction
    },
  });

  const extractionPrompt = buildDocumentExtractionPrompt(mode);

  console.log(`[Gemini] Pass 1: Extracting structure from ${rawText.length} char document (mode=${mode})`);

  const result = await model.generateContent([
    { text: extractionPrompt },
    { text: rawText },
  ]);

  const extracted = result.response.text().trim();
  console.log(`[Gemini] Pass 1 complete: extracted ${extracted.length} chars (${Math.round((1 - extracted.length / rawText.length) * 100)}% compression)`);

  return extracted;
}

// ─────────────────────────────────────────────
// FLOW GENERATION (returns validated JSON)
// ─────────────────────────────────────────────

interface GenerateFlowParams {
  input: string;
  source: 'brain_dump' | 'existing_plan';
  generation_mode: 'exact_tracking' | 'ai_enhancement';
  ai_intensity?: 'light_touch' | 'full_touch';
  context?: {
    primary_goal?: string;
    constraints?: string;
    optimization_style?: string;
  };
  clarification_answers?: string[];
  added_context?: string;
}

export async function generateFlow(
  params: GenerateFlowParams
): Promise<{ output: GenerationOutput; validationErrors?: { field: string; message: string }[] }> {
  if (USE_MOCK) {
    const mockOutput = await generateMockFlow(params);
    return { output: mockOutput };
  }

  const client = getClient();
  const model = client.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.3,
      topP: 0.9,
      // Large structured documents can produce 30-50 tasks → easily 8K+ tokens of JSON.
      // 4096 was causing silent truncation → broken JSON → parse failure.
      maxOutputTokens: 16384,
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          flow_title: { type: SchemaType.STRING },
          generation_mode: { type: SchemaType.STRING },
          confidence: { type: SchemaType.NUMBER },
          clarification_needed: { type: SchemaType.BOOLEAN },
          clarification_questions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          detected_goal: { type: SchemaType.STRING },
          interpretation_summary: { type: SchemaType.STRING },
          milestones: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING },
                summary: { type: SchemaType.STRING },
              },
              required: ['title', 'summary']
            }
          },
          tasks: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                order_index: { type: SchemaType.NUMBER },
                title: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING },
                done_definition: { type: SchemaType.STRING },
                estimated_duration_minutes: { type: SchemaType.NUMBER },
                milestone: { type: SchemaType.STRING },
                provenance: { 
                  type: SchemaType.STRING,
                  format: "enum",
                  enum: ['user_originated', 'ai_split', 'ai_added']
                },
              },
              required: ['order_index', 'title', 'description', 'done_definition', 'estimated_duration_minutes', 'milestone', 'provenance']
            }
          }
        },
        required: ['flow_title', 'generation_mode', 'confidence', 'clarification_needed', 'clarification_questions', 'detected_goal', 'milestones', 'tasks']
      }
    },
  });

  // Select correct system prompt
  const systemPrompt = params.source === 'brain_dump'
    ? buildBrainDumpGenerationPrompt(params.generation_mode)
    : buildExistingPlanGenerationPrompt(params.generation_mode, params.ai_intensity);

  // Build user message with all available context
  let userMessage = params.input;

  // ── Two-Pass Pipeline for large documents ──
  // If the raw input is very large (e.g. 76K char PDF), it will consume the entire
  // context window and leave no room for output. We run a focused extraction pass first.
  if (params.source === 'existing_plan' && userMessage.length > LARGE_INPUT_THRESHOLD) {
    console.log(`[Gemini] Large document detected (${userMessage.length} chars > ${LARGE_INPUT_THRESHOLD} threshold). Running two-pass pipeline.`);
    try {
      const extracted = await extractDocumentStructure(userMessage, params.generation_mode);

      if (extracted && extracted.length > 100) {
        // Replace the raw document with the structured extraction
        userMessage = `--- STRUCTURED EXTRACTION FROM UPLOADED DOCUMENT ---\nThe following is a structured extraction from the user's full uploaded document. It preserves all execution-relevant content in source order.\n\n${extracted}\n\n--- END OF EXTRACTION ---`;
      } else {
        console.warn(`[Gemini] Pass 1 extraction returned very short result (${extracted?.length} chars). Falling back to truncation.`);
        // Fallback: truncate to a reasonable size with a note
        const truncatedInput = userMessage.substring(0, LARGE_INPUT_THRESHOLD);
        userMessage = `--- TRUNCATED DOCUMENT (original was ${params.input.length} chars) ---\n${truncatedInput}\n\n[Document was truncated to fit processing limits. Content above represents the first portion of the source.]`;
      }
    } catch (extractErr) {
      console.error(`[Gemini] Pass 1 extraction failed:`, extractErr);
      // Fallback: truncate
      const truncatedInput = userMessage.substring(0, LARGE_INPUT_THRESHOLD);
      userMessage = `--- TRUNCATED DOCUMENT (original was ${params.input.length} chars) ---\n${truncatedInput}\n\n[Document was truncated due to extraction failure. Content above represents the first portion of the source.]`;
    }
  }

  if (params.context) {
    const ctx = params.context;
    userMessage += '\n\n--- ADDITIONAL CONTEXT ---';
    if (ctx.primary_goal) userMessage += `\nPrimary Goal: ${ctx.primary_goal}`;
    if (ctx.constraints) userMessage += `\nConstraints: ${ctx.constraints}`;
    if (ctx.optimization_style) userMessage += `\nOptimization Style: ${ctx.optimization_style}`;
  }

  if (params.added_context) {
    userMessage += `\n\n--- ADDED CONTEXT (from review) ---\n${params.added_context}`;
  }

  if (params.clarification_answers && params.clarification_answers.length > 0) {
    userMessage += '\n\n--- CLARIFICATION ANSWERS ---';
    params.clarification_answers.forEach((answer, i) => {
      userMessage += `\nAnswer ${i + 1}: ${answer}`;
    });
  }

  // Anti-Drift Guard
  userMessage += `\n\n=== CRITICAL OUTPUT REMINDER ===\nYOUR ENTIRE RESPONSE MUST BE A STRICT, VALID JSON OBJECT. START WITH { AND END WITH }. NO PROSE.`;

  // Log input size for debugging
  console.log(`[Gemini] Input size: system=${systemPrompt.length} chars, user=${userMessage.length} chars, source=${params.source}`);

  // Attempt generation with 1 silent retry on validation failure
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await model.generateContent([
        { text: systemPrompt },
        { text: userMessage },
      ]);

      // ── Diagnostic logging ──
      const response = result.response;
      const finishReason = response.candidates?.[0]?.finishReason;
      let responseText = '';

      try {
        responseText = response.text().trim();
      } catch (textErr) {
        // response.text() can throw if the response was blocked or empty
        console.error(`[Gemini] Attempt ${attempt + 1}: response.text() threw:`, textErr);
        console.error(`[Gemini] finishReason=${finishReason}, candidates=`, JSON.stringify(response.candidates?.map(c => ({
          finishReason: c.finishReason,
          safetyRatings: c.safetyRatings,
          contentPartsCount: c.content?.parts?.length,
        }))));

        if (attempt === 0) continue;
        throw new Error(
          `Gemini returned no usable text (finishReason: ${finishReason}). ` +
          'The response may have been blocked by safety filters or was empty. Please try again.'
        );
      }

      console.log(`[Gemini] Attempt ${attempt + 1}: finishReason=${finishReason}, responseLength=${responseText.length}, first50=${JSON.stringify(responseText.substring(0, 50))}, last50=${JSON.stringify(responseText.substring(responseText.length - 50))}`);

      // If finishReason is MAX_TOKENS, the JSON is truncated
      const finishReasonStr = String(finishReason || '');
      if (finishReasonStr === 'MAX_TOKENS' || finishReasonStr === 'LENGTH') {
        console.error(`[Gemini] Attempt ${attempt + 1}: Response was TRUNCATED (finishReason=${finishReason}).`);
        // Try to repair truncated JSON by closing open brackets/braces
        const repaired = attemptJsonRepair(responseText);
        if (repaired) {
          responseText = repaired;
          console.log(`[Gemini] Truncation repair succeeded.`);
        } else {
          if (attempt === 0) continue;
          throw new Error(
            'The AI response was cut off because the execution plan is too large. ' +
            'Try uploading a shorter document or using AI Enhancement mode with Light Touch to reduce task count.'
          );
        }
      }

      // ── 3-tier JSON extraction ──────────────────────
      let jsonString: string | null = null;

      // Tier 1: Direct parse (ideal — model returned clean JSON)
      if (responseText.startsWith('{')) {
        try {
          JSON.parse(responseText);
          jsonString = responseText;
        } catch { /* not clean JSON, fall through */ }
      }

      // Tier 2: Extract from markdown fenced code block
      if (!jsonString) {
        const fencedMatch = responseText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
        if (fencedMatch && fencedMatch[1]) {
          const inner = fencedMatch[1].trim();
          try {
            JSON.parse(inner);
            jsonString = inner;
          } catch { /* fenced content not valid JSON */ }
        }
      }

      // Tier 3: Greedy extraction of first balanced { ... } object
      if (!jsonString) {
        const startIdx = responseText.indexOf('{');
        if (startIdx !== -1) {
          let depth = 0;
          let endIdx = -1;
          for (let i = startIdx; i < responseText.length; i++) {
            if (responseText[i] === '{') depth++;
            else if (responseText[i] === '}') {
              depth--;
              if (depth === 0) { endIdx = i; break; }
            }
          }
          if (endIdx !== -1) {
            const candidate = responseText.substring(startIdx, endIdx + 1);
            try {
              JSON.parse(candidate);
              jsonString = candidate;
            } catch { /* extracted block not valid JSON */ }
          }
        }
      }

      // Tier 4: Truncation repair (if all above failed, try closing incomplete JSON)
      if (!jsonString) {
        const repaired = attemptJsonRepair(responseText);
        if (repaired) {
          jsonString = repaired;
          console.log(`[Gemini] Tier 4 truncation repair succeeded.`);
        }
      }

      // All tiers failed
      if (!jsonString) {
        console.error(`[Gemini] Attempt ${attempt + 1}: ALL PARSE TIERS FAILED.`);
        console.error(`[Gemini] Raw response (first 1000 chars):`, responseText.substring(0, 1000));
        console.error(`[Gemini] Raw response (last 500 chars):`, responseText.substring(responseText.length - 500));
        if (attempt === 0) continue; // silent retry
        throw new Error(
          'Gemini returned a response that could not be parsed as JSON. ' +
          'This usually means the model returned prose instead of structured data. ' +
          'Please try again.'
        );
      }

      const parsed: GenerationOutput = JSON.parse(jsonString);

      // Validate
      const validation = validateGenerationOutput(parsed, params.generation_mode);

      if (!validation.valid) {
        console.error(`[Gemini] Attempt ${attempt + 1}: Validation failed:`, validation.errors);
        if (attempt === 0) continue; // silent retry
        return { output: parsed, validationErrors: validation.errors };
      }

      return { output: parsed };
    } catch (err) {
      console.error(`[Gemini] Attempt ${attempt + 1} error:`, err);
      if (attempt === 0) continue; // silent retry
      throw err;
    }
  }

  // This should never be reached due to throws above, but TypeScript needs it
  throw new Error('Generation failed after retry');
}

