import { prisma } from "../config/prisma.js";
import type {
  Prisma,
  ProvisioningRequest,
} from "../generated/prisma/client.js";
import { AdapterRegistry } from "../adapters/registry.js";
import type { GovernancePlan } from "../schemas/governance.js";
import { generateGovernancePlan } from "./aiEngine.js";
import {
  evaluatePolicyVeto,
  PolicyVetoEngine,
} from "./policyVeto.js";

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  const serialized = JSON.stringify(value);

  if (serialized === undefined) {
    return {};
  }

  return JSON.parse(serialized) as Prisma.InputJsonValue;
}

async function recordAuditLog(
  requestId: string,
  targetSystem: string,
  action: string,
  status: string,
  details: unknown,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      requestId,
      targetSystem,
      action,
      status,
      details: toJsonValue(details),
    },
  });
}

async function vetoRequest(params: {
  employeeId: string;
  eventType: string;
  riskScore: number;
  sodConflicts: string[];
  stagedPayload: unknown;
  rejectionReason: string;
}): Promise<ProvisioningRequest> {
  const vetoedRequest = await prisma.provisioningRequest.create({
    data: {
      employeeId: params.employeeId,
      eventType: params.eventType,
      riskScore: params.riskScore,
      sodConflicts: params.sodConflicts,
      stagedPayload: toJsonValue(params.stagedPayload),
      status: "VETOED",
      rejectionReason: params.rejectionReason,
    },
  });

  await recordAuditLog(
    vetoedRequest.id,
    "GOVERNANCE",
    "POLICY_VETO",
    "VETOED",
    { rejectionReason: params.rejectionReason },
  );

  return vetoedRequest;
}

export async function executeProvisioningActions(
  requestId: string,
  plan: GovernancePlan,
): Promise<void> {
  for (const proposedAction of plan.proposedActions) {
    const groupName =
      typeof proposedAction.parameters?.groupName === "string"
        ? proposedAction.parameters.groupName
        : null;

    try {
      const response = await AdapterRegistry.getAdapter(
        proposedAction.targetSystem,
      ).execute(proposedAction.action, proposedAction.parameters);

      if (response?.success === false) {
        throw new Error("The provisioning adapter reported a failed action.");
      }

      await recordAuditLog(
        requestId,
        proposedAction.targetSystem,
        proposedAction.action,
        "SUCCESS",
        { response, groupName },
      );
    } catch (error) {
      await recordAuditLog(
        requestId,
        proposedAction.targetSystem,
        proposedAction.action,
        "FAILURE",
        {
          groupName,
          error:
            error instanceof Error
              ? { name: error.name, message: error.message }
              : { message: String(error) },
        },
      );
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
    return vetoRequest({
      employeeId: employee.id,
      eventType,
      riskScore: 1.0,
      sodConflicts: preAiEvaluation.violations,
      stagedPayload: { employeeId, eventType, hrPayload },
      rejectionReason: preAiEvaluation.violations.join("; "),
    });
  }

  const plan = await generateGovernancePlan(
    { employee, hrPayload },
    eventType,
  );

  const veto = evaluatePolicyVeto({ ...hrPayload, eventType }, plan);

  if (veto.isVetoed) {
    return vetoRequest({
      employeeId: employee.id,
      eventType,
      riskScore: veto.forcedRiskScore ?? plan.riskScore,
      sodConflicts: veto.reason ? [veto.reason] : plan.sodConflictsDetected,
      stagedPayload: plan,
      rejectionReason: veto.reason ?? "Policy veto",
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

  await executeProvisioningActions(provisioningRequest.id, plan);

  return prisma.provisioningRequest.update({
    where: { id: provisioningRequest.id },
    data: { status: "EXECUTED" },
  });
}
