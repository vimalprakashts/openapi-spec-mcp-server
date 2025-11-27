import { BaseTool } from './base-tool';
import { OpenAPISpec } from '../types/openapi';

export class GetApiInfoTool extends BaseTool {
  name = 'get_api_info';
  description = 'Get general information about the API specification';
  schema = {
    type: 'object',
    properties: {},
  };

  async execute(_args: any, spec: OpenAPISpec | null, url: string | null): Promise<any> {
    if (!spec) {
      throw new Error('No OpenAPI specification loaded');
    }

    const info: any = {
      // Basic info
      title: spec.info.title,
      version: spec.info.version,
      description: spec.info.description,
      
      // Contact info
      contact: spec.info.contact,
      
      // License
      license: spec.info.license,
      
      // Terms of service
      termsOfService: spec.info.termsOfService,
      
      // OpenAPI version
      openApiVersion: spec.openapi,
      
      // Servers
      servers: spec.servers || [],
      
      // External docs
      externalDocs: spec.externalDocs,
      
      // Current URL
      specUrl: url || 'Not available',
    };

    // Statistics
    const stats = {
      totalEndpoints: 0,
      totalPaths: Object.keys(spec.paths || {}).length,
      methods: {} as Record<string, number>,
      tags: new Set<string>(),
      schemas: Object.keys(spec.components?.schemas || {}).length,
      securitySchemes: Object.keys(spec.components?.securitySchemes || {}).length,
    };

    // Count endpoints and methods
    for (const pathItem of Object.values(spec.paths || {})) {
      if (!pathItem) continue;
      
      const methods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
      for (const method of methods) {
        if (pathItem[method as keyof typeof pathItem]) {
          stats.totalEndpoints++;
          stats.methods[method.toUpperCase()] = (stats.methods[method.toUpperCase()] || 0) + 1;
          
          // Collect tags
          const operation = pathItem[method as keyof typeof pathItem] as any;
          if (operation?.tags) {
            operation.tags.forEach((tag: string) => stats.tags.add(tag));
          }
        }
      }
    }

    info.statistics = {
      totalEndpoints: stats.totalEndpoints,
      totalPaths: stats.totalPaths,
      methodDistribution: stats.methods,
      totalTags: stats.tags.size,
      tags: Array.from(stats.tags),
      totalSchemas: stats.schemas,
      totalSecuritySchemes: stats.securitySchemes,
    };

    // Security info
    if (spec.components?.securitySchemes) {
      info.security = {
        schemes: Object.entries(spec.components.securitySchemes).map(([name, scheme]) => ({
          name,
          type: scheme.type,
          description: scheme.description,
        })),
        globalRequirements: spec.security || [],
      };
    }

    // Tags info
    if (spec.tags) {
      info.tags = spec.tags.map(tag => ({
        name: tag.name,
        description: tag.description,
        externalDocs: tag.externalDocs,
      }));
    }

    return info;
  }
}