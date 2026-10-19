import type { Adapter, AdapterExecutionResult } from "./interface.js";

export class SlackAdapter implements Adapter {
  async execute(
    action: string,
    parameters: Record<string, unknown>,
  ): Promise<AdapterExecutionResult> {
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    console.log(`[SlackAdapter] Executing ${action}`, parameters);

    return {
      success: true,
      targetSystem: "SLACK",
      action,
      response: {
        ok: true,
        channel: parameters.channel ?? "mock-channel",
        timestamp: `${Date.now() / 1000}`,
      },
    };
  }
}
