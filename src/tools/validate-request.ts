import { BaseTool } from './base-tool';
import { OpenAPISpec, Operation, PathItem, Parameter, Schema } from '../types/openapi';

interface ValidateRequestArgs {
  path: string;
  method: string;
  params?: Record<string, any>;
  headers?: Record<string, any>;
  body?: any;
}

interface ValidationResult {
  valid: boolean;
  errors: Array<{
    location: string;
    field: string;
    message: string;
  }>;
  warnings: string[];
}

export class ValidateRequestTool extends BaseTool {
  name = 'validate_request';
  description = 'Validate a request against the OpenAPI schema';
  schema = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The API endpoint path',
      },
      method: {
        type: 'string',
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
        description: 'The HTTP method',
      },
      params: {
        type: 'object',
        description: 'Query and path parameters',
      },
      headers: {
        type: 'object',
        description: 'Request headers',
      },
      body: {
        type: ['object', 'array', 'string', 'number', 'boolean', 'null'],
        description: 'Request body',
      },
    },
    required: ['path', 'method'],
  };


  constructor() {
    super();
  }

  async execute(args: ValidateRequestArgs, spec: OpenAPISpec | null): Promise<any> {
    if (!spec) {
      throw new Error('No OpenAPI specification loaded');
    }

    this.validateArgs(args, ['path', 'method']);

    const { path, method, params = {}, headers = {}, body } = args;
    const pathItem: PathItem | undefined = spec.paths[path];

    if (!pathItem) {
      throw new Error(`Path not found: ${path}`);
    }

    const methodLower = method.toLowerCase() as keyof PathItem;
    const operation = pathItem[methodLower] as Operation | undefined;

    if (!operation) {
      throw new Error(`Method ${method} not found for path ${path}`);
    }

    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    // Extract all parameters
    const allParameters = [
      ...(pathItem.parameters || []),
      ...(operation.parameters || []),
    ];

    // Validate path parameters
    const pathParams = allParameters.filter(p => p.in === 'path');
    this.validatePathParameters(pathParams, params, path, result);

    // Validate query parameters
    const queryParams = allParameters.filter(p => p.in === 'query');
    this.validateQueryParameters(queryParams, params, result);

    // Validate header parameters
    const headerParams = allParameters.filter(p => p.in === 'header');
    this.validateHeaderParameters(headerParams, headers, result);

    // Validate request body
    if (operation.requestBody) {
      this.validateRequestBody(operation.requestBody, body, spec, result);
    } else if (body !== undefined && body !== null) {
      result.warnings.push('Request body provided but not expected for this endpoint');
    }

    // Check for deprecated endpoint
    if (operation.deprecated) {
      result.warnings.push('This endpoint is deprecated');
    }

    result.valid = result.errors.length === 0;

    return result;
  }

  private validatePathParameters(
    parameters: Parameter[],
    providedParams: Record<string, any>,
    _path: string,
    result: ValidationResult
  ): void {
    // Extract path parameter names from the path
    // const pathParamMatches = path.match(/{([^}]+)}/g);
    // const expectedPathParams = pathParamMatches
    //   ? pathParamMatches.map(match => match.slice(1, -1))
    //   : [];

    for (const param of parameters) {
      if (param.required !== false) {
        if (!(param.name in providedParams)) {
          result.errors.push({
            location: 'path',
            field: param.name,
            message: `Required path parameter '${param.name}' is missing`,
          });
        }
      }

      if (param.name in providedParams) {
        const value = providedParams[param.name];
        
        // Validate against schema if provided
        if (param.schema) {
          const validationErrors = this.validateAgainstSchema(value, param.schema, param.name);
          validationErrors.forEach(error => {
            result.errors.push({
              location: 'path',
              field: param.name,
              message: error,
            });
          });
        }

        // Check if deprecated
        if (param.deprecated) {
          result.warnings.push(`Path parameter '${param.name}' is deprecated`);
        }
      }
    }
  }

  private validateQueryParameters(
    parameters: Parameter[],
    providedParams: Record<string, any>,
    result: ValidationResult
  ): void {
    for (const param of parameters) {
      if (param.required && !(param.name in providedParams)) {
        result.errors.push({
          location: 'query',
          field: param.name,
          message: `Required query parameter '${param.name}' is missing`,
        });
      }

      if (param.name in providedParams) {
        const value = providedParams[param.name];
        
        // Validate against schema if provided
        if (param.schema) {
          const validationErrors = this.validateAgainstSchema(value, param.schema, param.name);
          validationErrors.forEach(error => {
            result.errors.push({
              location: 'query',
              field: param.name,
              message: error,
            });
          });
        }

        // Check if deprecated
        if (param.deprecated) {
          result.warnings.push(`Query parameter '${param.name}' is deprecated`);
        }

        // Check allowEmptyValue
        if (!param.allowEmptyValue && value === '') {
          result.errors.push({
            location: 'query',
            field: param.name,
            message: `Query parameter '${param.name}' cannot be empty`,
          });
        }
      }
    }
  }

  private validateHeaderParameters(
    parameters: Parameter[],
    providedHeaders: Record<string, any>,
    result: ValidationResult
  ): void {
    for (const param of parameters) {
      const headerName = param.name.toLowerCase();
      const providedHeadersLower = Object.keys(providedHeaders).reduce((acc, key) => {
        acc[key.toLowerCase()] = providedHeaders[key];
        return acc;
      }, {} as Record<string, any>);

      if (param.required && !(headerName in providedHeadersLower)) {
        result.errors.push({
          location: 'header',
          field: param.name,
          message: `Required header '${param.name}' is missing`,
        });
      }

      if (headerName in providedHeadersLower) {
        const value = providedHeadersLower[headerName];
        
        // Validate against schema if provided
        if (param.schema) {
          const validationErrors = this.validateAgainstSchema(value, param.schema, param.name);
          validationErrors.forEach(error => {
            result.errors.push({
              location: 'header',
              field: param.name,
              message: error,
            });
          });
        }

        // Check if deprecated
        if (param.deprecated) {
          result.warnings.push(`Header '${param.name}' is deprecated`);
        }
      }
    }
  }

  private validateRequestBody(
    requestBody: any,
    providedBody: any,
    spec: OpenAPISpec,
    result: ValidationResult
  ): void {
    if (requestBody.required && (providedBody === undefined || providedBody === null)) {
      result.errors.push({
        location: 'body',
        field: 'body',
        message: 'Request body is required but not provided',
      });
      return;
    }

    if (providedBody === undefined || providedBody === null) {
      return;
    }

    // Get the schema for the content type (assuming application/json)
    const content = requestBody.content;
    if (!content) {
      return;
    }

    const jsonContent = content['application/json'];
    if (!jsonContent || !jsonContent.schema) {
      return;
    }

    let schema = jsonContent.schema;

    // Resolve $ref if present
    if (schema.$ref) {
      schema = this.resolveRef(schema.$ref, spec);
      if (!schema) {
        result.warnings.push(`Could not resolve schema reference: ${jsonContent.schema.$ref}`);
        return;
      }
    }

    // Validate the body against the schema
    const validationErrors = this.validateAgainstSchema(providedBody, schema, 'body');
    validationErrors.forEach(error => {
      result.errors.push({
        location: 'body',
        field: 'body',
        message: error,
      });
    });
  }

  private validateAgainstSchema(value: any, schema: Schema, _fieldName: string): string[] {
    const errors: string[] = [];

    // Basic type validation
    if (schema.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (schema.type !== actualType) {
        errors.push(`Expected type '${schema.type}' but got '${actualType}'`);
      }
    }

    // String validations
    if (schema.type === 'string' && typeof value === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push(`String length is less than minimum ${schema.minLength}`);
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push(`String length exceeds maximum ${schema.maxLength}`);
      }
      if (schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
          errors.push(`String does not match pattern: ${schema.pattern}`);
        }
      }
    }

    // Number validations
    if ((schema.type === 'number' || schema.type === 'integer') && typeof value === 'number') {
      if (schema.type === 'integer' && !Number.isInteger(value)) {
        errors.push('Expected integer but got decimal number');
      }
      if (schema.minimum !== undefined) {
        if (schema.exclusiveMinimum && value <= schema.minimum) {
          errors.push(`Value must be greater than ${schema.minimum}`);
        } else if (!schema.exclusiveMinimum && value < schema.minimum) {
          errors.push(`Value must be greater than or equal to ${schema.minimum}`);
        }
      }
      if (schema.maximum !== undefined) {
        if (schema.exclusiveMaximum && value >= schema.maximum) {
          errors.push(`Value must be less than ${schema.maximum}`);
        } else if (!schema.exclusiveMaximum && value > schema.maximum) {
          errors.push(`Value must be less than or equal to ${schema.maximum}`);
        }
      }
      if (schema.multipleOf !== undefined && value % schema.multipleOf !== 0) {
        errors.push(`Value must be a multiple of ${schema.multipleOf}`);
      }
    }

    // Array validations
    if (schema.type === 'array' && Array.isArray(value)) {
      if (schema.minItems !== undefined && value.length < schema.minItems) {
        errors.push(`Array has fewer items than minimum ${schema.minItems}`);
      }
      if (schema.maxItems !== undefined && value.length > schema.maxItems) {
        errors.push(`Array has more items than maximum ${schema.maxItems}`);
      }
      if (schema.uniqueItems && new Set(value).size !== value.length) {
        errors.push('Array items must be unique');
      }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`Value must be one of: ${schema.enum.join(', ')}`);
    }

    // Object validations
    if (schema.type === 'object' && typeof value === 'object' && !Array.isArray(value)) {
      // Check required properties
      if (schema.required) {
        for (const requiredProp of schema.required) {
          if (!(requiredProp in value)) {
            errors.push(`Missing required property: ${requiredProp}`);
          }
        }
      }

      // Check property count
      const propCount = Object.keys(value).length;
      if (schema.minProperties !== undefined && propCount < schema.minProperties) {
        errors.push(`Object has fewer properties than minimum ${schema.minProperties}`);
      }
      if (schema.maxProperties !== undefined && propCount > schema.maxProperties) {
        errors.push(`Object has more properties than maximum ${schema.maxProperties}`);
      }
    }

    return errors;
  }

  private resolveRef(ref: string, spec: OpenAPISpec): Schema | null {
    if (!ref.startsWith('#/')) {
      return null;
    }

    const path = ref.substring(2).split('/');
    let current: any = spec;

    for (const segment of path) {
      if (current && typeof current === 'object' && segment in current) {
        current = current[segment];
      } else {
        return null;
      }
    }

    return current as Schema;
  }
}