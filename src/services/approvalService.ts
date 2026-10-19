import { prisma } from "../config/prisma.js";

export async function listPendingApprovals() {
  const requests = await prisma.provisioningRequest.findMany({
    where: { status: "PENDING_HITL" },
    select: {
      id: true,
      employeeId: true,
      eventType: true,
      riskScore: true,
      sodConflicts: true,
      stagedPayload: true,
      status: true,
      rejectionReason: true,
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
