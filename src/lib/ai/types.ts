// Generation-specific types for the AI pipeline
// These are separate from database.ts to keep concerns clean

export interface GeneratedTask {
  order_index: number;
  title: string;
  description: string;
  done_definition: string;
  estimated_duration_minutes: number;
  milestone: string;
  provenance: 'user_originated' | 'ai_split' | 'ai_added';
}

export interface GeneratedMilestone {
  title: string;
  summary: string;
}

export interface GenerationOutput {
  flow_title: string;
  generation_mode: 'exact_tracking' | 'ai_enhancement';
  confidence: number;
  clarification_needed: boolean;
  clarification_questions: string[];
  interpretation_summary?: string;
  detected_goal: string;
  milestones: GeneratedMilestone[];
  tasks: GeneratedTask[];
}

export interface EnhanceRequest {
  text: string;
  mode: 'brain_dump' | 'existing_plan';
}

export interface EnhanceResponse {
  enhanced_text: string;
}

export interface GenerateRequest {
  raw_input: string;
  enhanced_input?: string;
  source: 'brain_dump' | 'existing_plan';
  generation_mode: 'exact_tracking' | 'ai_enhancement';
  ai_intensity?: 'light_touch' | 'full_touch';
  context?: {
    primary_goal?: string;
    constraints?: string;
    optimization_style?: string;
  };
  clarification_answers?: string[];
  // For regeneration from Review Gate
  added_context?: string;
  existing_flow_id?: string;
}

export interface GenerateResponse {
  success: boolean;
  // If clarification is needed — no flowId, no persistence
  clarification_needed?: boolean;
  clarification_questions?: string[];
  interpretation_summary?: string;
  // If generation succeeded and was persisted
  flow_id?: string;
  // For client-side review display before routing
  generation?: GenerationOutput;
  // Error state
  error?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}
