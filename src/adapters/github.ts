import type { Adapter, AdapterExecutionResult } from "./interface.js";

export class GitHubAdapter implements Adapter {
  async execute(
    action: string,
    parameters: Record<string, unknown>,
  ): Promise<AdapterExecutionResult> {
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    console.log(`[GitHubAdapter] Executing ${action}`, parameters);

    return {
      success: true,
      targetSystem: "GITHUB",
      action,
      response: {
        status: 200,
        login: parameters.login ?? "mock-github-user",
        eventId: `github-mock-${Date.now()}`,
      },
    };
  }
}
