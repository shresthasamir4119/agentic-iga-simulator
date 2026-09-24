import { prisma } from "../config/prisma.js";

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
