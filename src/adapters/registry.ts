import { ActiveDirectoryAdapter } from "./activeDirectory";
import { GitHubAdapter } from "./github";
import type { Adapter } from "./interface";
import { SlackAdapter } from "./slack";

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
