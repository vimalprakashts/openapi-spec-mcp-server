import { OpenAPISpec } from '../types/openapi';

export interface ToolSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
}

export abstract class BaseTool {
  abstract name: string;
  abstract description: string;
  abstract schema: ToolSchema;

  abstract execute(args: any, spec: OpenAPISpec | null, url: string | null): Promise<any>;

  protected validateArgs(args: any, required: string[]): void {
    if (!args || typeof args !== 'object') {
      throw new Error('Invalid arguments provided');
    }

    for (const field of required) {
      if (!(field in args)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  protected formatJson(data: any): string {
    return JSON.stringify(data, null, 2);
  }
}