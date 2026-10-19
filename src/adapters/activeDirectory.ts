import type { Adapter, AdapterExecutionResult } from "./interface.js";

export class ActiveDirectoryAdapter implements Adapter {
  async execute(
    action: string,
    parameters: Record<string, unknown>,
  ): Promise<AdapterExecutionResult> {
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    console.log(`[ActiveDirectoryAdapter] Executing ${action}`, parameters);

    return {
      success: true,
      targetSystem: "ACTIVE_DIRECTORY",
      action,
      response: {
        status: 200,
        operationId: `ad-mock-${Date.now()}`,
        userPrincipalName:
          parameters.userPrincipalName ?? "mock.user@example.com",
      },
    };
  }
}
