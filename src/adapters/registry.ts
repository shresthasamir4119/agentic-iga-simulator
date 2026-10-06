import { ActiveDirectoryAdapter } from "./activeDirectory.js";
import { GitHubAdapter } from "./github.js";
import type { Adapter } from "./interface.js";
import { SlackAdapter } from "./slack.js";

export class AdapterRegistry {
  private static readonly adapters: ReadonlyMap<string, Adapter> = new Map([
    ["ACTIVE_DIRECTORY", new ActiveDirectoryAdapter()],
    ["SLACK", new SlackAdapter()],
    ["GITHUB", new GitHubAdapter()],
  ]);

  static getAdapter(targetSystem: string): Adapter {
    const adapter = AdapterRegistry.adapters.get(targetSystem);

    if (!adapter) {
      throw new Error(`Unsupported target system: ${targetSystem}`);
    }

    return adapter;
  }
}
