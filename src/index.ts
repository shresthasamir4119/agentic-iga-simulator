import "dotenv/config";
import Fastify from "fastify";

const app = Fastify({ logger: true });

app.get("/", async () => ({ status: "ok" }));

const start = async (): Promise<void> => {
  const port = Number(process.env.PORT ?? 3000);

  try {
    await app.listen({ port, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();
