import { GenerationOutput } from './types';

// ─────────────────────────────────────────────
// PROMPT ENHANCEMENT MOCK
// ─────────────────────────────────────────────

export async function enhanceMockPrompt(
  rawText: string,
  mode: 'brain_dump' | 'existing_plan'
): Promise<string> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  if (mode === 'brain_dump') {
    return `### PROJECT GOAL
Launch "${rawText.substring(0, 60)}..." — transform raw project intent into a validated, execution-ready plan.

### DESIRED OUTCOME
A fully sequenced execution flow with clearly defined atomic tasks, observable done-definitions, and realistic time estimates.

### KEY CONTEXT
The user has provided a brain dump that needs to be structured into actionable execution steps. The project appears to involve software delivery with multiple workstreams.

### CONSTRAINTS
- Solo execution environment
- Tasks must be completable in 5–45 minute blocks
- No external team dependencies assumed unless stated

### PRIORITIES
1. Core architecture and environment stability
2. Feature implementation in dependency order
3. Integration verification before launch

### IMPORTANT NOTES
This brief was enhanced from an unstructured brain dump. The downstream execution engine will generate atomic tasks from this material.`;
  }
  
  return `### PROJECT GOAL
Execute the structured plan: "${rawText.substring(0, 60)}..."

### DESIRED OUTCOME
A refined execution flow that preserves the source plan's structure while improving clarity and actionability.

### KEY CONTEXT
The user provided a pre-existing plan document. Source structure should be preserved with minimal restructuring.

### CONSTRAINTS
- Follow source document ordering where possible
- Maintain original milestone groupings
- Solo execution context

### PRIORITIES
1. Preserve source plan integrity
2. Improve task-level clarity
3. Ensure observable done-definitions

### IMPORTANT NOTES
This brief was refined from existing plan material. The source document's structure has been respected during refinement.`;
}

// ─────────────────────────────────────────────
// FLOW GENERATION MOCK
// ─────────────────────────────────────────────

interface GenerateMockFlowParams {
  input: string;
  source: 'brain_dump' | 'existing_plan';
  generation_mode: 'exact_tracking' | 'ai_enhancement';
  clarification_answers?: string[];
}

export async function generateMockFlow(
  params: GenerateMockFlowParams
): Promise<GenerationOutput> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // If user already confirmed/answered, skip clarification and proceed to generation
  if (params.clarification_answers && params.clarification_answers.length > 0) {
    // Fall through to the generation block below
  }
  // Trigger question-based Clarification if 'clarify' is in the input
  else if (params.input.toLowerCase().includes('clarify')) {
    return {
      flow_title: "Clarification Needed",
      generation_mode: params.generation_mode,
      detected_goal: "Unknown — requires clarification",
      confidence: 50,
      clarification_needed: true,
      clarification_questions: [
        "What is the primary deadline for this project?",
        "Are there any specific technology constraints we must follow?",
        "Who is the primary audience for this execution flow?"
      ],
      milestones: [],
      tasks: []
    };
  }
  // Default: ALWAYS show interpretation-confirmation before first generation.
  // This lets the user see what the AI understood before committing.
  else {
    const inputTrimmed = params.input.trim();
    return {
      flow_title: "Interpretation Confirmation",
      generation_mode: params.generation_mode,
      detected_goal: inputTrimmed.length > 60 ? inputTrimmed.substring(0, 60) + '...' : inputTrimmed,
      confidence: 85,
      clarification_needed: true,
      clarification_questions: [],
      interpretation_summary: `Based on your input, the system understands your goal as:\n\n"${inputTrimmed.length > 200 ? inputTrimmed.substring(0, 200) + '...' : inputTrimmed}"\n\n• Approach: ${params.generation_mode === 'exact_tracking' ? 'Preserve your structure exactly as provided' : 'AI-optimized task ordering for the best execution sequence'}\n• The system will break this down into atomic tasks with clear done-definitions\n• Each task will be scoped to 5–45 minutes of focused solo work\n\nIf this matches your intent, continue to generate. Otherwise, go back and refine your input.`,
      milestones: [],
      tasks: []
    };
  }

  // Realistic mock flow for typical user input
  return {
    flow_title: "Product Launch Execution",
    generation_mode: params.generation_mode,
    detected_goal: "SaaS MVP Launch",
    confidence: 94,
    clarification_needed: false,
    clarification_questions: [],
    milestones: [
      {
        title: "Infrastructure Ready",
        summary: "Core environment and services are fully configured and operational."
      },
      {
        title: "MVP Feature Complete",
        summary: "All critical UI and integration work is completed and verified."
      }
    ],
    tasks: [
      {
        order_index: 1,
        title: "Configure production environment variables and secrets",
        description: "Set up all env vars, database connection strings, and API keys for the production deployment gate.",
        done_definition: "All services pingable and build passes on CI.",
        estimated_duration_minutes: 30,
        milestone: "Infrastructure Ready",
        provenance: "user_originated"
      },
      {
        order_index: 2,
        title: "Scaffold foundational UI components with design tokens",
        description: "Build Button, Card, and HubLayout primitives using the approved design system tokens.",
        done_definition: "Component library renders correctly in dev dashboard without errors.",
        estimated_duration_minutes: 45,
        milestone: "Infrastructure Ready",
        provenance: "user_originated"
      },
      {
        order_index: 3,
        title: "Connect AI processing engine to persistence layer",
        description: "Wire the generation pipeline output into Supabase flow and node table inserts.",
        done_definition: "Database record created and retrieved successfully in a single end-to-end session.",
        estimated_duration_minutes: 40,
        milestone: "MVP Feature Complete",
        provenance: "ai_split"
      },
      {
        order_index: 4,
        title: "Validate end-to-end flow from intake to review gate",
        description: "Run a full pipeline test: brain dump input → generation → persistence → review gate display.",
        done_definition: "Review Gate page loads with generated tasks from a fresh brain dump submission.",
        estimated_duration_minutes: 25,
        milestone: "MVP Feature Complete",
        provenance: "ai_added"
      }
    ]
  };
}
