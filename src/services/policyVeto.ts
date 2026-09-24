import type {
  GovernancePlan,
  ProvisioningAction,
} from "../schemas/governance";

export type EmployeeStatus = "ACTIVE" | "SUSPENDED" | "TERMINATED";

export interface PolicyEvaluationResult {
  passed: boolean;
  violations: string[];
}

export class PolicyVetoEngine {
  private static readonly TERMINATED_BLOCKED_ACTIONS: ReadonlySet<
    ProvisioningAction["action"]
  > = new Set(["CREATE_ACCOUNT", "ADD_TO_GROUP", "GRANT_ORG_ROLE"]);

  private static readonly ACTIVE_DIRECTORY_GROUPS: ReadonlySet<string> =
    new Set([
      "All Employees",
      "Engineering",
      "Finance",
      "Human Resources",
      "IT Support",
    ]);

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

      if (
        action.targetSystem === "ACTIVE_DIRECTORY" &&
        action.action === "ADD_TO_GROUP"
      ) {
        const groupName = action.parameters.groupName;

        if (
          typeof groupName !== "string" ||
          !PolicyVetoEngine.ACTIVE_DIRECTORY_GROUPS.has(groupName)
        ) {
          violations.push(
            `Active Directory group "${String(groupName)}" is not allowed.`,
          );
        }
      }
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }
}
