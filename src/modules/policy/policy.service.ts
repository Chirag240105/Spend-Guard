import { Policy as PrismaPolicy } from '@prisma/client';
import { getPrismaClient } from '../../infrastructure/database';
import { CompiledPolicy, Policy } from './policy.types';
import { validateCompiledPolicy } from './policy.validator';

/**
 * Policy Service - manages policy lifecycle
 */
export class PolicyService {
  /**
   * Create a new policy from natural language and compiled policy
   */
  static async createPolicy(
    name: string,
    naturalLanguage: string,
    compiledPolicy: CompiledPolicy,
  ): Promise<Policy> {
    const prisma = getPrismaClient();

    // Validate the compiled policy
    const validation = validateCompiledPolicy(compiledPolicy);
    if (!validation.valid) {
      throw new Error(`Invalid policy: ${validation.error}`);
    }

    const policy = await prisma.policy.create({
      data: {
        name,
        naturalLanguage,
        compiledPolicy: validation.policy!,
        version: 1,
        active: true,
      },
    });

    return this.mapDatabasePolicyToDomain(policy);
  }

  /**
   * Get a policy by ID
   */
  static async getPolicyById(policyId: string): Promise<Policy | null> {
    const prisma = getPrismaClient();
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
    });

    return policy ? this.mapDatabasePolicyToDomain(policy) : null;
  }

  /**
   * Update a policy
   */
  static async updatePolicy(policyId: string, compiledPolicy: CompiledPolicy): Promise<Policy> {
    const prisma = getPrismaClient();

    // Validate the compiled policy
    const validation = validateCompiledPolicy(compiledPolicy);
    if (!validation.valid) {
      throw new Error(`Invalid policy: ${validation.error}`);
    }

    const policy = await prisma.policy.update({
      where: { id: policyId },
      data: {
        compiledPolicy: validation.policy!,
        version: {
          increment: 1,
        },
      },
    });

    return this.mapDatabasePolicyToDomain(policy);
  }

  /**
   * Deactivate a policy
   */
  static async deactivatePolicy(policyId: string): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.policy.update({
      where: { id: policyId },
      data: { active: false },
    });
  }

  /**
   * List all active policies
   */
  static async listActivePolicies(): Promise<Policy[]> {
    const prisma = getPrismaClient();
    const policies = await prisma.policy.findMany({
      where: { active: true },
    });

    return policies.map((p) => this.mapDatabasePolicyToDomain(p));
  }

  static async listPolicies(options: { skip?: number; take?: number; active?: boolean } = {}) {
    const prisma = getPrismaClient();
    const where = options.active === undefined ? undefined : { active: options.active };
    const [items, total] = await Promise.all([
      prisma.policy.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: options.skip,
        take: options.take,
      }),
      prisma.policy.count({ where }),
    ]);
    return { items: items.map((item) => this.mapDatabasePolicyToDomain(item)), total };
  }

  private static mapDatabasePolicyToDomain(policy: PrismaPolicy): Policy {
    return {
      id: policy.id,
      name: policy.name,
      naturalLanguage: policy.naturalLanguage,
      compiledPolicy: policy.compiledPolicy as CompiledPolicy,
      version: policy.version,
      active: policy.active,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    };
  }
}
