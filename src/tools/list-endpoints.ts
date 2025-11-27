import { BaseTool } from './base-tool';
import { OpenAPISpec, Operation } from '../types/openapi';

interface ListEndpointsArgs {
  tag?: string;
  method?: string;
  deprecated?: boolean;
  limit?: number;
  offset?: number;
}

interface EndpointInfo {
  path: string;
  method: string;
  summary?: string;
  description?: string;
  tags?: string[];
  operationId?: string;
  deprecated?: boolean;
}

export class ListEndpointsTool extends BaseTool {
  name = 'list_endpoints';
  description = 'List all available API endpoints with optional filtering';
  schema = {
    type: 'object',
    properties: {
      tag: {
        type: 'string',
        description: 'Filter endpoints by tag',
      },
      method: {
        type: 'string',
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
        description: 'Filter endpoints by HTTP method',
      },
      deprecated: {
        type: 'boolean',
        description: 'Include or exclude deprecated endpoints',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of endpoints to return',
        default: 100,
      },
      offset: {
        type: 'number',
        description: 'Number of endpoints to skip',
        default: 0,
      },
    },
  };

  async execute(args: ListEndpointsArgs, spec: OpenAPISpec | null): Promise<any> {
    if (!spec) {
      throw new Error('No OpenAPI specification loaded');
    }

    const endpoints: EndpointInfo[] = [];
    const { tag, method, deprecated, limit = 100, offset = 0 } = args || {};

    // Iterate through all paths
    for (const [pathName, pathItem] of Object.entries(spec.paths)) {
      if (!pathItem) continue;

      // Get operations for this path
      const operations: Array<[string, Operation | undefined]> = [
        ['GET', pathItem.get],
        ['PUT', pathItem.put],
        ['POST', pathItem.post],
        ['DELETE', pathItem.delete],
        ['OPTIONS', pathItem.options],
        ['HEAD', pathItem.head],
        ['PATCH', pathItem.patch],
        ['TRACE', pathItem.trace],
      ];

      for (const [httpMethod, operation] of operations) {
        if (!operation) continue;

        // Apply filters
        if (method && httpMethod !== method.toUpperCase()) continue;
        if (tag && (!operation.tags || !operation.tags.includes(tag))) continue;
        if (deprecated !== undefined && operation.deprecated !== deprecated) continue;

        endpoints.push({
          path: pathName,
          method: httpMethod,
          summary: operation.summary,
          description: operation.description,
          tags: operation.tags,
          operationId: operation.operationId,
          deprecated: operation.deprecated,
        });
      }
    }

    // Sort endpoints by path and method
    endpoints.sort((a, b) => {
      const pathCompare = a.path.localeCompare(b.path);
      if (pathCompare !== 0) return pathCompare;
      return a.method.localeCompare(b.method);
    });

    // Apply pagination
    const paginatedEndpoints = endpoints.slice(offset, offset + limit);

    return {
      total: endpoints.length,
      count: paginatedEndpoints.length,
      offset,
      limit,
      endpoints: paginatedEndpoints,
    };
  }
}