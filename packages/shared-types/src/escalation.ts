export type EscalationTargetType = 'operator' | 'team' | 'specific_user';

export interface EscalationRule {
  id: string;
  companyId: string;
  name: string;
  conditions: EscalationCondition[];
  targetType: EscalationTargetType;
  targetId: string | null;
  priority: number;
  isActive: boolean;
  createdAt: Date;
}

export interface EscalationCondition {
  type: 'sentiment_below' | 'intent_match' | 'confidence_below' | 'explicit_request' | 'max_bot_turns' | 'outside_hours';
  value: string | number;
}

export interface Operator {
  id: string;
  companyId: string;
  userId: string;
  maxConcurrent: number;
  isOnline: boolean;
  skills: string[];
  createdAt: Date;
}
