import { BaseTool } from './base-tool';
import { OpenAPISpec, Schema } from '../types/openapi';

interface GetSchemasArgs {
  schemaName?: string;
  listAll?: boolean;
}

export class GetSchemasTool extends BaseTool {
  name = 'get_schemas';
  description = 'Get schema definitions from the OpenAPI specification';
  schema = {
    type: 'object',
    properties: {
      schemaName: {
        type: 'string',
        description: 'Name of a specific schema to retrieve',
      },
      listAll: {
        type: 'boolean',
        description: 'List all available schema names',
        default: false,
      },
    },
  };

  async execute(args: GetSchemasArgs, spec: OpenAPISpec | null): Promise<any> {
    if (!spec) {
      throw new Error('No OpenAPI specification loaded');
    }

    const { schemaName, listAll } = args || {};

    if (!spec.components || !spec.components.schemas) {
      return {
        message: 'No schemas defined in this OpenAPI specification',
        schemas: [],
      };
    }

    // List all schema names
    if (listAll || (!schemaName)) {
      const schemaNames = Object.keys(spec.components.schemas);
      return {
        count: schemaNames.length,
        schemas: schemaNames.map(name => ({
          name,
          type: this.getSchemaType(spec.components!.schemas![name]),
          description: spec.components!.schemas![name].description,
        })),
      };
    }

    // Get specific schema
    if (schemaName) {
      const schema = spec.components.schemas[schemaName];
      if (!schema) {
        throw new Error(`Schema not found: ${schemaName}`);
      }

      return {
        name: schemaName,
        schema: this.expandSchema(schema, spec),
      };
    }

    return {
      message: 'Please specify either schemaName or set listAll to true',
    };
  }

  private getSchemaType(schema: Schema): string {
    if (schema.$ref) return 'reference';
    if (schema.type) return schema.type;
    if (schema.allOf) return 'allOf';
    if (schema.oneOf) return 'oneOf';
    if (schema.anyOf) return 'anyOf';
    return 'unknown';
  }

  private expandSchema(schema: Schema, spec: OpenAPISpec): any {
    const expanded: any = { ...schema };

    // Resolve $ref if it's a reference
    if (schema.$ref) {
      const refPath = schema.$ref.split('/');
      if (refPath[0] === '#' && refPath[1] === 'components' && refPath[2] === 'schemas') {
        const referencedSchema = spec.components?.schemas?.[refPath[3]];
        if (referencedSchema) {
          expanded.$ref = schema.$ref;
          expanded.resolvedSchema = this.expandSchema(referencedSchema, spec);
        }
      }
    }

    // Expand properties if it's an object
    if (schema.properties) {
      expanded.properties = {};
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        expanded.properties[propName] = this.expandSchema(propSchema, spec);
      }
    }

    // Expand items if it's an array
    if (schema.items) {
      expanded.items = this.expandSchema(schema.items, spec);
    }

    // Expand composition schemas
    if (schema.allOf) {
      expanded.allOf = schema.allOf.map(s => this.expandSchema(s, spec));
    }
    if (schema.oneOf) {
      expanded.oneOf = schema.oneOf.map(s => this.expandSchema(s, spec));
    }
    if (schema.anyOf) {
      expanded.anyOf = schema.anyOf.map(s => this.expandSchema(s, spec));
    }

    return expanded;
  }
}