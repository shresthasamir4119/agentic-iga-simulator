import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../config/prisma.js";
import {
  GovernancePlanSchema,
  type GovernancePlan,
} from "../schemas/governance.js";
import { executeProvisioningActions } from "../services/orchestrator.js";

type ApprovalRoute = {
  Params: {
    id: string;
  };
};

type RejectionRoute = ApprovalRoute & {
  Body: {
    reason?: unknown;
  };
};

const DEFAULT_REJECTION_REASON = "Rejected by a human reviewer.";

export async function approveRequest(
  request: FastifyRequest<ApprovalRoute>,
  reply: FastifyReply,
) {
  const provisioningRequest = await prisma.provisioningRequest.findUnique({
    where: { id: request.params.id },
  });

  if (!provisioningRequest) {
    return reply.code(404).send({ error: "Approval request not found." });
  }

  if (provisioningRequest.status !== "PENDING_HITL") {
    return reply.code(409).send({
      error: "Only PENDING_HITL requests can be approved.",
    });
  }

  let plan: GovernancePlan;

  try {
    plan = GovernancePlanSchema.parse(provisioningRequest.stagedPayload);
  } catch {
    return reply.code(400).send({
      error: "The staged payload does not match the governance plan schema.",
    });
  }

  await executeProvisioningActions(provisioningRequest.id, plan);

  const [updatedRequest] = await prisma.$transaction([
    prisma.provisioningRequest.update({
      where: { id: provisioningRequest.id },
      data: {
        status: "APPROVED_AND_EXECUTED",
        rejectionReason: null,
      },
    }),
    prisma.auditLog.create({
      data: {
        requestId: provisioningRequest.id,
        targetSystem: "GOVERNANCE",
        action: "APPROVE_REQUEST",
        status: "SUCCESS",
        details: {
          status: "APPROVED_AND_EXECUTED",
        },
      },
    }),
  ]);

  return updatedRequest;
}

export async function rejectRequest(
  request: FastifyRequest<RejectionRoute>,
  reply: FastifyReply,
) {
  const body = request.body;

  if (body?.reason !== undefined && typeof body.reason !== "string") {
    return reply.code(400).send({ error: "reason must be a string." });
  }

  const reason =
    typeof body?.reason === "string" && body.reason.trim().length > 0
      ? body.reason.trim()
      : DEFAULT_REJECTION_REASON;

  const provisioningRequest = await prisma.provisioningRequest.findUnique({
    where: { id: request.params.id },
  });

  if (!provisioningRequest) {
    return reply.code(404).send({ error: "Approval request not found." });
  }

  if (provisioningRequest.status !== "PENDING_HITL") {
    return reply.code(409).send({
      error: "Only PENDING_HITL requests can be rejected.",
    });
  }

  const [updatedRequest] = await prisma.$transaction([
    prisma.provisioningRequest.update({
      where: { id: provisioningRequest.id },
      data: {
        status: "REJECTED_BY_HUMAN",
        rejectionReason: reason,
      },
    }),
    prisma.auditLog.create({
      data: {
        requestId: provisioningRequest.id,
        targetSystem: "GOVERNANCE",
        action: "REJECT_REQUEST",
        status: "SUCCESS",
        details: {
          reason,
        },
      },
    }),
  ]);

  return updatedRequest;
}
