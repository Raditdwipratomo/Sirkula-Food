import type {
  ConditionStatus,
  LeftoverSource,
  PathwayType,
  WasteProfile,
  WasteReason,
} from '@/domain/constants';

export type UserRole = 'admin' | 'staff';

export interface OrganizationRow {
  id: string;
  name: string;
  join_code: string;
  is_demo: boolean;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  organization_id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface MenuRow {
  id: string;
  organization_id: string;
  name: string;
  category: string | null;
  waste_profile: WasteProfile;
  is_active: boolean;
  created_at: string;
}

export interface WasteLogRow {
  id: string;
  organization_id: string;
  menu_id: string;
  recorded_by: string;
  recorded_at: string;
  prepared_portions: number;
  served_portions: number;
  leftover_weight_g: number;
  weight_method: 'timbang' | 'perkiraan';
  leftover_source: LeftoverSource;
  condition_status: ConditionStatus;
  reason: WasteReason;
  notes: string | null;
  created_at: string;
}

export interface WasteActionRow {
  id: string;
  organization_id: string;
  waste_log_id: string;
  recorded_by: string;
  recommended_pathway: PathwayType | null;
  action_type: PathwayType;
  weight_g: number;
  partner_or_target: string | null;
  action_date: string;
  notes: string | null;
  created_at: string;
}

export interface AiRecommendationRow {
  id: string;
  organization_id: string;
  created_by: string;
  interaction_type: 'auto_insight' | 'contextual_chat';
  user_prompt: string | null;
  period_start: string;
  period_end: string;
  model_id: string;
  input_summary: Record<string, unknown>;
  result: Record<string, unknown>;
  status: 'completed' | 'fallback_rule_based' | 'failed';
  created_at: string;
}
