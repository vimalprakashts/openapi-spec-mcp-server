import { BaseTool } from './base-tool';
import { OpenAPISpec, Operation, PathItem } from '../types/openapi';

interface GetEndpointDetailsArgs {
  path: string;
  method: string;
}

export class GetEndpointDetailsTool extends BaseTool {
  name = 'get_endpoint_details';
  description = 'Get detailed information about a specific API endpoint';
  schema = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The API endpoint path (e.g., /users/{id})',
      },
      method: {
        type: 'string',
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE'],
        description: 'The HTTP method',
      },
    },
    required: ['path', 'method'],
  };

  async execute(args: GetEndpointDetailsArgs, spec: OpenAPISpec | null): Promise<any> {
    if (!spec) {
      throw new Error('No OpenAPI specification loaded');
    }

    this.validateArgs(args, ['path', 'method']);

    const { path, method } = args;
    const pathItem: PathItem | undefined = spec.paths[path];

    if (!pathItem) {
      throw new Error(`Path not found: ${path}`);
    }

    const methodLower = method.toLowerCase() as keyof PathItem;
    const operation = pathItem[methodLower] as Operation | undefined;

    if (!operation) {
      throw new Error(`Method ${method} not found for path ${path}`);
    }

    // Build detailed response
    const details: any = {
      path,
      method: method.toUpperCase(),
      summary: operation.summary,
      description: operation.description,
      operationId: operation.operationId,
      tags: operation.tags || [],
      deprecated: operation.deprecated || false,
    };

    // Add parameters
    if (operation.parameters || pathItem.parameters) {
      const allParameters = [
        ...(pathItem.parameters || []),
        ...(operation.parameters || []),
      ];
      
      details.parameters = allParameters.map(param => ({
        name: param.name,
        in: param.in,
        required: param.required || false,
        description: param.description,
        schema: param.schema,
        deprecated: param.deprecated || false,
      }));
    }

    // Add request body
    if (operation.requestBody) {
      details.requestBody = {
        required: operation.requestBody.required || false,
        description: operation.requestBody.description,
        content: operation.requestBody.content,
      };
    }

    // Add responses
    if (operation.responses) {
      details.responses = {};
      for (const [statusCode, response] of Object.entries(operation.responses)) {
        details.responses[statusCode] = {
          description: response.description,
          content: response.content,
          headers: response.headers,
        };
      }
    }

    // Add security requirements
    if (operation.security) {
      details.security = operation.security;
    } else if (spec.security) {
      details.security = spec.security;
    }

    // Add servers
    if (operation.servers) {
      details.servers = operation.servers;
    } else if (spec.servers) {
      details.servers = spec.servers;
    }

    // Add external docs
    if (operation.externalDocs) {
      details.externalDocs = operation.externalDocs;
    }

    return details;
  }
}