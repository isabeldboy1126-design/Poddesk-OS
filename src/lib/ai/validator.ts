import { GenerationOutput, ValidationError } from './types';

const BANNED_TITLE_PREFIXES = [
  'work on', 'handle', 'improve', 'prepare', 'execute', 'verify',
  'continue', 'finalize', 'manage', 'ensure', 'address', 'brainstorm',
  'think about', 'consider', 'plan for', 'organize', 'get started'
];

export function validateGenerationOutput(
  output: GenerationOutput,
  requestedMode: 'exact_tracking' | 'ai_enhancement'
): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  // If clarification is needed, skip task validation entirely
  if (output.clarification_needed) {
    // Two valid clarification modes:
    // 1. Question mode: clarification_questions has items
    // 2. Interpretation-confirmation mode: interpretation_summary is present, questions may be empty
    const hasQuestions = output.clarification_questions && output.clarification_questions.length > 0;
    const hasInterpretation = !!output.interpretation_summary;

    if (!hasQuestions && !hasInterpretation) {
      errors.push({ field: 'clarification_questions', message: 'Clarification needed but no questions or interpretation summary provided' });
    }
    if (output.clarification_questions && output.clarification_questions.length > 5) {
      errors.push({ field: 'clarification_questions', message: 'Maximum 5 clarification questions allowed' });
    }
    // Tasks array should be empty when clarification is needed
    if (output.tasks && output.tasks.length > 0) {
      errors.push({ field: 'tasks', message: 'Tasks must be empty when clarification is needed' });
    }
    return { valid: errors.length === 0, errors };
  }

  // Task count: 2-50
  if (output.tasks.length < 2) {
    errors.push({ field: 'tasks', message: `Minimum 2 tasks required, got ${output.tasks.length}` });
  }
  if (output.tasks.length > 50) {
    errors.push({ field: 'tasks', message: `Maximum 50 tasks allowed, got ${output.tasks.length}` });
  }

  // Confidence: 0-100
  if (output.confidence < 0 || output.confidence > 100) {
    errors.push({ field: 'confidence', message: `Confidence must be 0-100, got ${output.confidence}` });
  }

  // Validate each task
  const seenTitles = new Set<string>();
  output.tasks.forEach((task, i) => {
    const prefix = `tasks[${i}]`;

    // Duration: 5-45 minutes
    if (task.estimated_duration_minutes < 5 || task.estimated_duration_minutes > 45) {
      errors.push({ field: `${prefix}.estimated_duration_minutes`, message: `Duration must be 5-45 min, got ${task.estimated_duration_minutes}` });
    }

    // Sequential order_index with no gaps
    if (task.order_index !== i + 1) {
      errors.push({ field: `${prefix}.order_index`, message: `Expected order_index ${i + 1}, got ${task.order_index}` });
    }

    // Title length: 10-120 chars
    if (task.title.length < 10 || task.title.length > 120) {
      errors.push({ field: `${prefix}.title`, message: `Title must be 10-120 chars, got ${task.title.length}` });
    }

    // No duplicate titles
    const normalizedTitle = task.title.toLowerCase().trim();
    if (seenTitles.has(normalizedTitle)) {
      errors.push({ field: `${prefix}.title`, message: `Duplicate task title: "${task.title}"` });
    }
    seenTitles.add(normalizedTitle);

    // Titles start with action verb (first word should not be a banned prefix)
    // These are soft warnings — they should not reject an otherwise valid flow
    const titleLower = task.title.toLowerCase();
    for (const banned of BANNED_TITLE_PREFIXES) {
      if (titleLower.startsWith(banned)) {
        console.warn(`[Validator] Warning: ${prefix}.title uses discouraged pattern: "${banned}" — "${task.title}"`);
        break;
      }
    }

    // Description under 150 chars — soft warning, not a hard failure
    if (task.description && task.description.length > 150) {
      console.warn(`[Validator] Warning: ${prefix}.description is ${task.description.length} chars (recommended under 150)`);
    }

    // Validate provenance and fallback if the AI hallucinates an invalid string (e.g. "Sprint 3")
    const validProvenances = ['user_originated', 'ai_split', 'ai_added'];
    if (!validProvenances.includes(task.provenance)) {
      console.warn(`[Validator] AI generated invalid provenance: "${task.provenance}". Reverting to "user_originated".`);
      // Mutate the output directly to save the DB insert
      task.provenance = 'user_originated';
    }

    // Exact tracking cannot contain ai_added provenance — hard rule
    if (requestedMode === 'exact_tracking' && task.provenance === 'ai_added') {
      errors.push({ field: `${prefix}.provenance`, message: 'Exact Tracking mode cannot contain ai_added provenance' });
    }
  });

  return { valid: errors.length === 0, errors };
}
