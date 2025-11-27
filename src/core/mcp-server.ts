import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { OpenAPISpec } from '../types/openapi';
import { OpenAPIClient } from './openapi-client';
import { CacheManager } from './cache-manager';
import { ConfigManager } from '../config';

// Import tools
import { ListEndpointsTool } from '../tools/list-endpoints';
import { GetEndpointDetailsTool } from '../tools/get-endpoint-details';
import { SearchEndpointsTool } from '../tools/search-endpoints';
import { GetSchemasTool } from '../tools/get-schemas';
import { GenerateCodeTool } from '../tools/generate-code';
import { ValidateRequestTool } from '../tools/validate-request';
import { GetApiInfoTool } from '../tools/get-api-info';
import { RefreshSpecTool } from '../tools/refresh-spec';

export class OpenAPIMCPServer {
  private server: Server;
  private openApiClient: OpenAPIClient;
  private cacheManager: CacheManager;
  private configManager: ConfigManager;
  private currentSpec: OpenAPISpec | null = null;
  private currentUrl: string | null = null;
  private tools: Map<string, any> = new Map();

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.server = new Server(
      {
        name: 'openapi-spec-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize cache manager
    this.cacheManager = new CacheManager(
      configManager.cacheDir,
      configManager.cacheTtl,
      configManager.maxCacheSize
    );

    // Initialize OpenAPI client
    this.openApiClient = new OpenAPIClient(
      this.cacheManager,
      configManager.requestTimeout,
      configManager.retryAttempts,
      configManager.retryDelay
    );

    this.setupHandlers();
    this.registerTools();
  }

  private registerTools(): void {
    // Register all available tools
    this.tools.set('list_endpoints', new ListEndpointsTool());
    this.tools.set('get_endpoint_details', new GetEndpointDetailsTool());
    this.tools.set('search_endpoints', new SearchEndpointsTool());
    this.tools.set('get_schemas', new GetSchemasTool());
    this.tools.set('generate_code', new GenerateCodeTool());
    this.tools.set('validate_request', new ValidateRequestTool());
    this.tools.set('get_api_info', new GetApiInfoTool());
    this.tools.set('refresh_spec', new RefreshSpecTool());
  }

  private setupHandlers(): void {
    // Handle list tools request
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [];
      
      for (const [name, tool] of this.tools) {
        tools.push({
          name,
          description: tool.description,
          inputSchema: tool.schema,
        });
      }

      return { tools };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Check if spec is loaded for tools that require it
      const toolsRequiringSpec = [
        'list_endpoints',
        'get_endpoint_details',
        'search_endpoints',
        'get_schemas',
        'generate_code',
        'validate_request',
        'get_api_info',
      ];

      if (toolsRequiringSpec.includes(name) && !this.currentSpec) {
        // Try to load spec from URL if provided
        if (args && typeof args === 'object' && 'url' in args && typeof args.url === 'string') {
          try {
            this.currentSpec = await this.openApiClient.fetchSpec(args.url);
            this.currentUrl = args.url;
          } catch (error) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Error loading OpenAPI spec: ${error}`,
                },
              ],
            };
          }
        } else if (this.configManager.openApiUrl) {
          try {
            this.currentSpec = await this.openApiClient.fetchSpec(this.configManager.openApiUrl);
            this.currentUrl = this.configManager.openApiUrl;
          } catch (error) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Error loading OpenAPI spec from config: ${error}`,
                },
              ],
            };
          }
        } else {
          return {
            content: [
              {
                type: 'text',
                text: 'No OpenAPI specification loaded. Please provide a URL or configure one.',
              },
            ],
          };
        }
      }

      // Handle refresh_spec tool specially
      if (name === 'refresh_spec') {
        try {
          const url = (args && typeof args === 'object' && 'url' in args && typeof args.url === 'string') 
            ? args.url 
            : this.currentUrl || this.configManager.openApiUrl;
          
          if (!url) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'No URL available to refresh. Please provide a URL.',
                },
              ],
            };
          }

          this.currentSpec = await this.openApiClient.refreshSpec(url);
          this.currentUrl = url;
          
          return {
            content: [
              {
                type: 'text',
                text: 'OpenAPI specification refreshed successfully.',
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error refreshing OpenAPI spec: ${error}`,
              },
            ],
          };
        }
      }

      // Get the tool
      const tool = this.tools.get(name);
      if (!tool) {
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
        };
      }

      try {
        // Execute the tool
        const result = await tool.execute(args, this.currentSpec, this.currentUrl);
        
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool ${name}: ${error}`,
            },
          ],
        };
      }
    });
  }

  async loadSpec(url: string): Promise<void> {
    try {
      this.currentSpec = await this.openApiClient.fetchSpec(url);
      this.currentUrl = url;
      console.error(`Successfully loaded OpenAPI spec from ${url}`);
    } catch (error) {
      console.error(`Failed to load OpenAPI spec: ${error}`);
      throw error;
    }
  }

  async run(): Promise<void> {
    // Load initial spec if configured
    if (this.configManager.openApiUrl) {
      try {
        await this.loadSpec(this.configManager.openApiUrl);
      } catch (error) {
        console.error(`Failed to load initial spec: ${error}`);
      }
    }

    // Start the server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('OpenAPI MCP Server running...');
  }
}