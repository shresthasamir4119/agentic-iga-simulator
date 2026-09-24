export interface Adapter {
  execute(action: string, parameters: Record<string, any>): Promise<any>;
}
