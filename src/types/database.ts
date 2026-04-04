export type FlowStatus = 'generating' | 'review' | 'active' | 'completed' | 'abandoned';
export type NodeStatus = 'locked' | 'active' | 'completed';
export type NodeProvenance = 'user_originated' | 'ai_split' | 'ai_added';

// Exact approved initial union set for PoddeskEventType
export type PoddeskEventType = 
  | 'flow_created'
  | 'flow_started'
  | 'flow_completed'
  | 'flow_abandoned'
  | 'task_started'
  | 'task_completed'
  | 'task_paused'
  | 'task_resumed'
  | 'ai_explain_requested';

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  onboarding_done: boolean;
  created_at: string;
  updated_at: string;
}

export interface Flow {
  id: string;
  user_id: string | null;
  title: string;
  raw_input: string;
  source: 'brain_dump' | 'existing_plan' | null;
  generation_mode: 'exact_tracking' | 'ai_enhancement' | null;
  status: FlowStatus;
  total_estimated_ms: number | null;
  total_actual_ms: number | null;
  efficiency_score: number | null;
  task_count: number | null;
  ai_confidence: number | null;
  detected_goal: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export interface Node {
  id: string;
  flow_id: string;
  parent_node_id: string | null;
  order_index: number;
  title: string;
  description: string | null;
  done_definition: string | null;
  milestone: string | null;
  status: NodeStatus;
  provenance: NodeProvenance;
  estimated_duration_ms: number | null;
  accumulated_duration_ms: number;
  last_resumed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  ai_explain_cache: string | null;
}

export interface Event {
  id: string;
  flow_id: string;
  node_id: string | null;
  event_type: PoddeskEventType;
  metadata: Record<string, unknown> | null; // Using explicit JSON record
  created_at: string;
}
