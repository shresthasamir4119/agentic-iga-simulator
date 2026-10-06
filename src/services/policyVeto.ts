import type {
  GovernancePlan,
  ProvisioningAction,
} from "../schemas/governance.js";

export type EmployeeStatus = "ACTIVE" | "SUSPENDED" | "TERMINATED";

export interface PolicyEvaluationResult {
  passed: boolean;
  violations: string[];
}

export interface VetoResult {
  isVetoed: boolean;
  reason?: string;
  forcedRiskScore?: number;
}

/**
 * Post-AI Veto: Forbidden Privilege Keyword Scan.
 * Flags implicit privilege escalation where a non-admin is granted
 * wildcard/root-level access.
 */
export function evaluatePolicyVeto(
  payload: Record<string, unknown>,
  aiResponse: GovernancePlan,
): VetoResult {
  const forbiddenKeywords = [
    "wildcard",
    "fullaccess",
    "full_access",
    "root",
    "superadmin",
    "all_databases",
  ];

  const containsForbiddenPrivilege = aiResponse.proposedActions.some(
    (action) => {
      const searchable =
        `${action.targetSystem} ${JSON.stringify(action.parameters)} ${action.reasoning}`.toLowerCase();

      return forbiddenKeywords.some((keyword) =>
        searchable.includes(keyword),
      );
    },
  );

  if (containsForbiddenPrivilege && payload.role !== "Platform-Admin") {
    return {
      isVetoed: true,
      reason: `VETOED: Detected implicit privilege escalation. Non-admin user targeted a resource containing restricted keywords ('Root/FullAccess').`,
      forcedRiskScore: 1.0,
    };
  }

  return { isVetoed: false };
}

export class PolicyVetoEngine {
  private static readonly TERMINATED_BLOCKED_ACTIONS: ReadonlySet<
    ProvisioningAction["action"]
  > = new Set(["CREATE_ACCOUNT", "ADD_TO_GROUP", "GRANT_ORG_ROLE"]);

  static evaluateEmployeeStatus(
    employeeStatus: EmployeeStatus,
  ): PolicyEvaluationResult {
    const violations: string[] = [];

    if (employeeStatus === "TERMINATED") {
      violations.push(
        "Employee status is TERMINATED; event vetoed before AI processing.",
      );
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }

  static evaluate(
    plan: GovernancePlan,
    employeeStatus: EmployeeStatus,
  ): PolicyEvaluationResult {
    const violations: string[] = [];

    for (const action of plan.proposedActions) {
      if (
        employeeStatus === "TERMINATED" &&
        PolicyVetoEngine.TERMINATED_BLOCKED_ACTIONS.has(action.action)
      ) {
        violations.push(
          `${action.action} cannot be executed for a terminated employee.`,
        );
      }
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }
}
