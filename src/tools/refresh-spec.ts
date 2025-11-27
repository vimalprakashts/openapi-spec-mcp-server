import { BaseTool } from './base-tool';
import { OpenAPISpec } from '../types/openapi';

interface RefreshSpecArgs {
  url?: string;
}

export class RefreshSpecTool extends BaseTool {
  name = 'refresh_spec';
  description = 'Refresh the OpenAPI specification from the server';
  schema = {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'Optional URL to fetch the spec from (uses configured URL if not provided)',
      },
    },
  };

  async execute(args: RefreshSpecArgs, _spec: OpenAPISpec | null, url: string | null): Promise<any> {
    // This tool is handled specially in the MCP server
    // It will trigger a refresh of the spec
    return {
      message: 'Specification refresh triggered',
      url: args.url || url || 'Configured URL',
    };
  }
}