import type { Adapter } from "./interface";

export class GitHubAdapter implements Adapter {
  async execute(
    action: string,
    parameters: Record<string, any>,
  ): Promise<any> {
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
