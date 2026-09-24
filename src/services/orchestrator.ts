import { prisma } from "../config/prisma.js";
import type {
  Prisma,
  ProvisioningRequest,
} from "../generated/prisma/client.js";
import { AdapterRegistry } from "../adapters/registry.js";
import { generateGovernancePlan } from "./aiEngine.js";
import { PolicyVetoEngine } from "./policyVeto.js";

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  const serialized = JSON.stringify(value);

  if (serialized === undefined) {
    return {};
  }

  return JSON.parse(serialized) as Prisma.InputJsonValue;
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

  const plan = await generateGovernancePlan(
    { employee, hrPayload },
    eventType,
  );
  const policyEvaluation = PolicyVetoEngine.evaluate(plan, employee.status);

  if (!policyEvaluation.passed) {
    return prisma.provisioningRequest.create({
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
          requestId: provisioningRequest.id,
          targetSystem: proposedAction.targetSystem,
          action: proposedAction.action,
          status: "SUCCESS",
          details: toJsonValue({ response }),
        },
      });
    } catch (error) {
      await prisma.auditLog.create({
        data: {
          requestId: provisioningRequest.id,
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

  return prisma.provisioningRequest.update({
    where: { id: provisioningRequest.id },
    data: { status: "EXECUTED" },
  });
}
