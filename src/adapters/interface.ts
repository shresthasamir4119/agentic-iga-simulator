export interface AdapterExecutionResult {
  success: boolean;
  targetSystem: string;
  action: string;
  response: Record<string, unknown>;
}

export interface Adapter {
  execute(
    action: string,
    parameters: Record<string, unknown>,
  ): Promise<AdapterExecutionResult>;
}
