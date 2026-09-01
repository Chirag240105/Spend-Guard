import { z } from 'zod';

// Time window for spending restrictions
export const TimeWindowSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
  end: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().optional().default('UTC'),
});

export type TimeWindow = z.infer<typeof TimeWindowSchema>;

// Approval rules
export const ApprovalRulesSchema = z.object({
  aboveAmount: z.number().positive().optional(),
  categories: z.array(z.string()).optional(),
});

export type ApprovalRules = z.infer<typeof ApprovalRulesSchema>;

// Spending limits
export const LimitsSchema = z.object({
  perTransaction: z.number().positive().optional(),
  daily: z.number().positive().optional(),
  weekly: z.number().positive().optional(),
  monthly: z.number().positive().optional(),
});

export type Limits = z.infer<typeof LimitsSchema>;

// Category restrictions
export const CategoriesSchema = z.object({
  allowed: z.array(z.string()).optional(),
  blocked: z.array(z.string()).optional(),
});

export type Categories = z.infer<typeof CategoriesSchema>;

// Merchant restrictions
export const MerchantsSchema = z.object({
  allowed: z.array(z.string()).optional(),
  blocked: z.array(z.string()).optional(),
});

export type Merchants = z.infer<typeof MerchantsSchema>;

// Compiled policy schema - the deterministic structure
export const CompiledPolicySchema = z.object({
  name: z.string(),
  limits: LimitsSchema,
  categories: CategoriesSchema,
  merchants: MerchantsSchema.optional(),
  timeWindow: TimeWindowSchema.optional(),
  approval: ApprovalRulesSchema.optional(),
});

export type CompiledPolicy = z.infer<typeof CompiledPolicySchema>;

// Full policy domain type
export interface Policy {
  id: string;
  name: string;
  naturalLanguage: string;
  compiledPolicy: CompiledPolicy;
  version: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Policy conflict type
export interface PolicyConflict {
  detected: boolean;
  conflicts: string[];
  message: string;
}
