import { prisma } from "../config/prisma.js";
import { GovernancePlanSchema } from "../schemas/governance.js";
import { executeProvisioningActions } from "./orchestrator.js";

export class ApprovalNotFoundError extends Error {
  constructor() {
    super("The approval request was not found.");
    this.name = "ApprovalNotFoundError";
  }
}

export class ApprovalStateError extends Error {
  constructor() {
    super("Only PENDING_HITL requests can be reviewed.");
    this.name = "ApprovalStateError";
  }
}

export async function listPendingApprovals() {
  const requests = await prisma.provisioningRequest.findMany({
    where: { status: "PENDING_HITL" },
    include: {
      employee: {
        select: { firstName: true, lastName: true },
      },
    },
    orderBy: { riskScore: "desc" },
  });

  return requests.map(({ employee, ...request }) => ({
    ...request,
    employeeName: `${employee.firstName} ${employee.lastName}`,
  }));
}

export async function approveProvisioningRequest(requestId: string) {
  const request = await prisma.provisioningRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new ApprovalNotFoundError();
  }

  if (request.status !== "PENDING_HITL") {
    throw new ApprovalStateError();
  }

  const plan = GovernancePlanSchema.parse(request.stagedPayload);
  await executeProvisioningActions(request.id, plan);

  return prisma.provisioningRequest.update({
    where: { id: request.id },
    data: { status: "EXECUTED", rejectionReason: null },
  });
}

export async function rejectProvisioningRequest(
  requestId: string,
  reason: string,
) {
  const result = await prisma.provisioningRequest.updateMany({
    where: { id: requestId, status: "PENDING_HITL" },
    data: {
      status: "VETOED",
      rejectionReason: reason,
    },
  });

  if (result.count === 0) {
    const request = await prisma.provisioningRequest.findUnique({
      where: { id: requestId },
      select: { id: true },
    });

    if (!request) {
      throw new ApprovalNotFoundError();
    }

    throw new ApprovalStateError();
  }

  return prisma.provisioningRequest.findUniqueOrThrow({
    where: { id: requestId },
  });
}
