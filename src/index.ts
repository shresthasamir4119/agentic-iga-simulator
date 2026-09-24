import path from "node:path";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { z } from "zod";
import { prisma } from "./config/prisma.js";
import {
  ApprovalNotFoundError,
  ApprovalStateError,
  approveProvisioningRequest,
  listPendingApprovals,
  rejectProvisioningRequest,
} from "./services/approvalService.js";
import { processJmlEvent } from "./services/orchestrator.js";

const HrWebhookPayloadSchema = z.object({
  employeeId: z.string().min(1),
  eventType: z.string().min(1),
  hrPayload: z.record(z.string(), z.unknown()),
});

const RouteParamsSchema = z.object({
  id: z.string().min(1),
});

const RejectionSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
});

export const app = Fastify({ logger: true });

app.decorate("prisma", prisma);

app.post("/api/webhooks/hr", async (request, reply) => {
  const payload = HrWebhookPayloadSchema.safeParse(request.body);

  if (!payload.success) {
    return reply.code(400).send({
      error: "Invalid HR webhook payload",
      details: payload.error.flatten(),
    });
  }

  const { employeeId, eventType, hrPayload } = payload.data;

  void processJmlEvent(employeeId, eventType, hrPayload).catch(
    (error: unknown) => {
      request.log.error(
        { err: error, employeeId, eventType },
        "Asynchronous JML event processing failed",
      );
    },
  );

  return reply.code(202).send({ accepted: true });
});

app.get("/api/approvals", async () => ({
  requests: await listPendingApprovals(),
}));

app.post("/api/approvals/:id/approve", async (request, reply) => {
  const params = RouteParamsSchema.safeParse(request.params);

  if (!params.success) {
    return reply.code(400).send({ error: "Invalid approval request ID" });
  }

  try {
    return await approveProvisioningRequest(params.data.id);
  } catch (error) {
    const statusCode =
      error instanceof ApprovalNotFoundError
        ? 404
        : error instanceof ApprovalStateError
          ? 409
          : 500;

    return reply.code(statusCode).send({
      error: error instanceof Error ? error.message : "Approval failed",
    });
  }
});

app.post("/api/approvals/:id/reject", async (request, reply) => {
  const params = RouteParamsSchema.safeParse(request.params);

  if (!params.success) {
    return reply.code(400).send({ error: "Invalid approval request ID" });
  }

  const body = RejectionSchema.safeParse(request.body ?? {});

  if (!body.success) {
    return reply.code(400).send({
      error: "Invalid rejection payload",
      details: body.error.flatten(),
    });
  }

  try {
    return await rejectProvisioningRequest(
      params.data.id,
      body.data.reason ?? "Rejected by a human reviewer.",
    );
  } catch (error) {
    const statusCode =
      error instanceof ApprovalNotFoundError
        ? 404
        : error instanceof ApprovalStateError
          ? 409
          : 500;

    return reply.code(statusCode).send({
      error: error instanceof Error ? error.message : "Rejection failed",
    });
  }
});

app.get("/api/audit-logs", async () => {
  const logs = await prisma.auditLog.findMany({
    select: {
      id: true,
      createdAt: true,
      targetSystem: true,
      action: true,
      status: true,
      details: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return { logs };
});

app.addHook("onClose", async () => {
  await prisma.$disconnect();
});

app.register(fastifyStatic, {
  root: path.resolve(__dirname, "..", "public"),
  index: ["index.html"],
});

const start = async (): Promise<void> => {
  try {
    await app.listen({ port: 3000, host: "0.0.0.0" });
  } catch (error) {
    app.log.error({ err: error }, "Failed to start the server");
    process.exit(1);
  }
};

void start();
