import Fastify from "fastify";
import { z } from "zod";
import { prisma } from "./config/prisma.js";
import { processJmlEvent } from "./services/orchestrator.js";

const HrWebhookPayloadSchema = z.object({
  employeeId: z.string().min(1),
  eventType: z.string().min(1),
  hrPayload: z.record(z.string(), z.unknown()),
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

app.addHook("onClose", async () => {
  await prisma.$disconnect();
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
