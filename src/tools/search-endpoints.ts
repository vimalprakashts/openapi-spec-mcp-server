import { BaseTool } from './base-tool';
import { OpenAPISpec, Operation } from '../types/openapi';
import Fuse from 'fuse.js';

interface SearchEndpointsArgs {
  query: string;
  searchIn?: string[];
  limit?: number;
}

interface SearchResult {
  path: string;
  method: string;
  summary?: string;
  description?: string;
  tags?: string[];
  operationId?: string;
  score: number;
}

export class SearchEndpointsTool extends BaseTool {
  name = 'search_endpoints';
  description = 'Search for endpoints using fuzzy matching across various fields';
  schema = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query string',
      },
      searchIn: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['path', 'summary', 'description', 'tags', 'operationId'],
        },
        description: 'Fields to search in (defaults to all)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return',
        default: 20,
      },
    },
    required: ['query'],
  };

  async execute(args: SearchEndpointsArgs, spec: OpenAPISpec | null): Promise<any> {
    if (!spec) {
      throw new Error('No OpenAPI specification loaded');
    }

    this.validateArgs(args, ['query']);

    const { query, searchIn, limit = 20 } = args;

    // Build search index
    const searchItems: any[] = [];
    
    for (const [pathName, pathItem] of Object.entries(spec.paths)) {
      if (!pathItem) continue;

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

      for (const [method, operation] of operations) {
        if (!operation) continue;

        searchItems.push({
          path: pathName,
          method,
          summary: operation.summary || '',
          description: operation.description || '',
          tags: (operation.tags || []).join(' '),
          operationId: operation.operationId || '',
          deprecated: operation.deprecated || false,
        });
      }
    }

    // Configure Fuse.js options
    const fuseOptions = {
      includeScore: true,
      threshold: 0.4,
      keys: searchIn || ['path', 'summary', 'description', 'tags', 'operationId'],
    };

    // Perform fuzzy search
    const fuse = new Fuse(searchItems, fuseOptions);
    const searchResults = fuse.search(query, { limit });

    // Format results
    const results: SearchResult[] = searchResults.map((result: any) => ({
      path: result.item.path,
      method: result.item.method,
      summary: result.item.summary || undefined,
      description: result.item.description || undefined,
      tags: result.item.tags ? result.item.tags.split(' ').filter(Boolean) : undefined,
      operationId: result.item.operationId || undefined,
      score: result.score || 0,
    }));

    return {
      query,
      count: results.length,
      results,
    };
  }
}