import { prisma } from "../config/prisma.js";
import type {
  Prisma,
  ProvisioningRequest,
} from "../generated/prisma/client.js";
import { AdapterRegistry } from "../adapters/registry.js";
import type { GovernancePlan } from "../schemas/governance.js";
import { generateGovernancePlan } from "./aiEngine.js";
import { PolicyVetoEngine } from "./policyVeto.js";

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  const serialized = JSON.stringify(value);

  if (serialized === undefined) {
    return {};
  }

  return JSON.parse(serialized) as Prisma.InputJsonValue;
}

export async function executeProvisioningActions(
  requestId: string,
  plan: GovernancePlan,
): Promise<void> {
  for (const proposedAction of plan.proposedActions) {
    try {
      const response = await AdapterRegistry.getAdapter(
        proposedAction.targetSystem,
      ).execute(proposedAction.action, proposedAction.parameters);

      if (response?.success === false) {
        throw new Error("The provisioning adapter reported a failed action.");
      }

      await prisma.auditLog.create({
        data: {
          requestId,
          targetSystem: proposedAction.targetSystem,
          action: proposedAction.action,
          status: "SUCCESS",
          details: toJsonValue({ response }),
        },
      });
    } catch (error) {
      await prisma.auditLog.create({
        data: {
          requestId,
          targetSystem: proposedAction.targetSystem,
          action: proposedAction.action,
          status: "FAILURE",
          details: toJsonValue({
            error:
              error instanceof Error
                ? { name: error.name, message: error.message }
                : { message: String(error) },
          }),
        },
      });
    }
  }
}

export async function processJmlEvent(
  employeeId: string,
  eventType: string,
  hrPayload: Record<string, unknown>,
): Promise<ProvisioningRequest> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new Error(`Employee ${employeeId} was not found.`);
  }

  const preAiEvaluation = PolicyVetoEngine.evaluateEmployeeStatus(
    employee.status,
  );

  if (!preAiEvaluation.passed) {
    const vetoedRequest = await prisma.provisioningRequest.create({
      data: {
        employeeId: employee.id,
        eventType,
        riskScore: 1.0,
        sodConflicts: preAiEvaluation.violations,
        stagedPayload: toJsonValue({ employeeId, eventType, hrPayload }),
        status: "VETOED",
        rejectionReason: preAiEvaluation.violations.join("; "),
      },
    });

    await prisma.auditLog.create({
      data: {
        requestId: vetoedRequest.id,
        targetSystem: "GOVERNANCE",
        action: "POLICY_VETO",
        status: "VETOED",
        details: toJsonValue({
          rejectionReason: vetoedRequest.rejectionReason,
        }),
      },
    });

    return vetoedRequest;
  }

  const plan = await generateGovernancePlan(
    { employee, hrPayload },
    eventType,
  );
  const policyEvaluation = PolicyVetoEngine.evaluate(plan, employee.status);

  if (!policyEvaluation.passed) {
    const vetoedRequest = await prisma.provisioningRequest.create({
      data: {
        employeeId: employee.id,
        eventType,
        riskScore: plan.riskScore,
        sodConflicts: plan.sodConflictsDetected,
        stagedPayload: toJsonValue(plan),
        status: "VETOED",
        rejectionReason: policyEvaluation.violations.join("; "),
      },
    });

    await prisma.auditLog.create({
      data: {
        requestId: vetoedRequest.id,
        targetSystem: "GOVERNANCE",
        action: "POLICY_VETO",
        status: "VETOED",
        details: toJsonValue({
          violations: policyEvaluation.violations,
          rejectionReason: policyEvaluation.violations.join("; "),
        }),
      },
    });

    return vetoedRequest;
  }

  if (plan.riskScore >= 0.7) {
    return prisma.provisioningRequest.create({
      data: {
        employeeId: employee.id,
        eventType,
        riskScore: plan.riskScore,
        sodConflicts: plan.sodConflictsDetected,
        stagedPayload: toJsonValue(plan),
        status: "PENDING_HITL",
      },
    });
  }

  const provisioningRequest = await prisma.provisioningRequest.create({
    data: {
      employeeId: employee.id,
      eventType,
      riskScore: plan.riskScore,
      sodConflicts: plan.sodConflictsDetected,
      stagedPayload: toJsonValue(plan),
      status: "PENDING_AI",
    },
  });

  await executeProvisioningActions(provisioningRequest.id, plan);

  return prisma.provisioningRequest.update({
    where: { id: provisioningRequest.id },
    data: { status: "EXECUTED" },
  });
}
