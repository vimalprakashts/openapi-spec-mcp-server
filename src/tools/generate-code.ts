import { BaseTool } from './base-tool';
import { OpenAPISpec, Operation, PathItem, Parameter } from '../types/openapi';

interface GenerateCodeArgs {
  path: string;
  method: string;
  language: string;
  includeAuth?: boolean;
  baseUrl?: string;
}

export class GenerateCodeTool extends BaseTool {
  name = 'generate_code';
  description = 'Generate code snippets for API endpoints in various languages';
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
      language: {
        type: 'string',
        enum: ['javascript', 'typescript', 'python', 'curl', 'fetch', 'axios'],
        description: 'The programming language for the code snippet',
      },
      includeAuth: {
        type: 'boolean',
        description: 'Include authentication setup in the code',
        default: false,
      },
      baseUrl: {
        type: 'string',
        description: 'Override the base URL for the API',
      },
    },
    required: ['path', 'method', 'language'],
  };

  async execute(args: GenerateCodeArgs, spec: OpenAPISpec | null): Promise<any> {
    if (!spec) {
      throw new Error('No OpenAPI specification loaded');
    }

    this.validateArgs(args, ['path', 'method', 'language']);

    const { path, method, language, includeAuth, baseUrl } = args;
    const pathItem: PathItem | undefined = spec.paths[path];

    if (!pathItem) {
      throw new Error(`Path not found: ${path}`);
    }

    const methodLower = method.toLowerCase() as keyof PathItem;
    const operation = pathItem[methodLower] as Operation | undefined;

    if (!operation) {
      throw new Error(`Method ${method} not found for path ${path}`);
    }

    const apiBaseUrl = baseUrl || spec.servers?.[0]?.url || 'https://api.example.com';

    // Generate code based on language
    let code = '';
    switch (language) {
      case 'javascript':
      case 'fetch':
        code = this.generateFetchCode(path, method, operation, pathItem, apiBaseUrl, includeAuth);
        break;
      case 'typescript':
        code = this.generateTypeScriptCode(path, method, operation, pathItem, apiBaseUrl, includeAuth);
        break;
      case 'python':
        code = this.generatePythonCode(path, method, operation, pathItem, apiBaseUrl, includeAuth);
        break;
      case 'curl':
        code = this.generateCurlCode(path, method, operation, pathItem, apiBaseUrl, includeAuth);
        break;
      case 'axios':
        code = this.generateAxiosCode(path, method, operation, pathItem, apiBaseUrl, includeAuth);
        break;
      default:
        throw new Error(`Unsupported language: ${language}`);
    }

    return {
      language,
      code,
      endpoint: {
        path,
        method: method.toUpperCase(),
        operationId: operation.operationId,
      },
    };
  }

  private generateFetchCode(
    path: string,
    method: string,
    operation: Operation,
    pathItem: PathItem,
    baseUrl: string,
    includeAuth?: boolean
  ): string {
    const params = this.extractParameters(operation, pathItem);
    const pathParams = params.filter(p => p.in === 'path');
    const queryParams = params.filter(p => p.in === 'query');
    const headerParams = params.filter(p => p.in === 'header');

    let code = `// ${operation.summary || `${method.toUpperCase()} ${path}`}\n\n`;

    // Path parameters
    if (pathParams.length > 0) {
      code += `// Path parameters\n`;
      pathParams.forEach(param => {
        code += `const ${this.toVariableName(param.name)} = 'value'; // ${param.description || ''}\n`;
      });
      code += '\n';
    }

    // Build URL
    let urlPath = path;
    pathParams.forEach(param => {
      urlPath = urlPath.replace(`{${param.name}}`, `\${${this.toVariableName(param.name)}}`);
    });

    code += `const url = \`${baseUrl}${urlPath}\`;\n\n`;

    // Query parameters
    if (queryParams.length > 0) {
      code += `// Query parameters\n`;
      code += `const params = new URLSearchParams({\n`;
      queryParams.forEach(param => {
        code += `  ${param.name}: 'value', // ${param.description || ''}\n`;
      });
      code += `});\n\n`;
    }

    // Headers
    code += `const headers = {\n`;
    code += `  'Content-Type': 'application/json',\n`;
    if (includeAuth) {
      code += `  'Authorization': 'Bearer YOUR_TOKEN',\n`;
    }
    headerParams.forEach(param => {
      code += `  '${param.name}': 'value', // ${param.description || ''}\n`;
    });
    code += `};\n\n`;

    // Request body
    if (operation.requestBody) {
      code += `// Request body\n`;
      code += `const body = JSON.stringify({\n`;
      code += `  // Add request body here\n`;
      code += `});\n\n`;
    }

    // Fetch request
    code += `const response = await fetch(`;
    if (queryParams.length > 0) {
      code += `\`\${url}?\${params}\``;
    } else {
      code += 'url';
    }
    code += `, {\n`;
    code += `  method: '${method.toUpperCase()}',\n`;
    code += `  headers,\n`;
    if (operation.requestBody && method.toUpperCase() !== 'GET') {
      code += `  body,\n`;
    }
    code += `});\n\n`;

    code += `const data = await response.json();\n`;
    code += `console.log(data);`;

    return code;
  }

  private generateTypeScriptCode(
    path: string,
    method: string,
    operation: Operation,
    pathItem: PathItem,
    baseUrl: string,
    includeAuth?: boolean
  ): string {
    const params = this.extractParameters(operation, pathItem);
    const pathParams = params.filter(p => p.in === 'path');
    const queryParams = params.filter(p => p.in === 'query');

    let code = `// ${operation.summary || `${method.toUpperCase()} ${path}`}\n\n`;

    // Interface for request
    if (operation.requestBody) {
      code += `interface RequestBody {\n`;
      code += `  // Define request body structure\n`;
      code += `  [key: string]: any;\n`;
      code += `}\n\n`;
    }

    code += `interface Response {\n`;
    code += `  // Define response structure\n`;
    code += `  [key: string]: any;\n`;
    code += `}\n\n`;

    code += `async function ${this.toFunctionName(operation.operationId || `${method}${this.pathToName(path)}`)}(\n`;
    
    // Function parameters
    const functionParams: string[] = [];
    pathParams.forEach(param => {
      functionParams.push(`  ${this.toVariableName(param.name)}: string`);
    });
    if (queryParams.length > 0) {
      functionParams.push(`  params?: { ${queryParams.map(p => `${p.name}?: any`).join(', ')} }`);
    }
    if (operation.requestBody) {
      functionParams.push(`  body: RequestBody`);
    }
    
    code += functionParams.join(',\n');
    code += `\n): Promise<Response> {\n`;

    // Build URL
    let urlPath = path;
    pathParams.forEach(param => {
      urlPath = urlPath.replace(`{${param.name}}`, `\${${this.toVariableName(param.name)}}`);
    });

    code += `  const url = \`${baseUrl}${urlPath}\`;\n\n`;

    // Query parameters
    if (queryParams.length > 0) {
      code += `  const queryParams = new URLSearchParams(params as any).toString();\n`;
      code += `  const fullUrl = queryParams ? \`\${url}?\${queryParams}\` : url;\n\n`;
    }

    // Headers
    code += `  const headers: HeadersInit = {\n`;
    code += `    'Content-Type': 'application/json',\n`;
    if (includeAuth) {
      code += `    'Authorization': 'Bearer YOUR_TOKEN',\n`;
    }
    code += `  };\n\n`;

    // Fetch request
    code += `  const response = await fetch(${queryParams.length > 0 ? 'fullUrl' : 'url'}, {\n`;
    code += `    method: '${method.toUpperCase()}',\n`;
    code += `    headers,\n`;
    if (operation.requestBody && method.toUpperCase() !== 'GET') {
      code += `    body: JSON.stringify(body),\n`;
    }
    code += `  });\n\n`;

    code += `  if (!response.ok) {\n`;
    code += `    throw new Error(\`HTTP error! status: \${response.status}\`);\n`;
    code += `  }\n\n`;

    code += `  return await response.json() as Response;\n`;
    code += `}`;

    return code;
  }

  private generatePythonCode(
    path: string,
    method: string,
    operation: Operation,
    pathItem: PathItem,
    baseUrl: string,
    includeAuth?: boolean
  ): string {
    const params = this.extractParameters(operation, pathItem);
    const pathParams = params.filter(p => p.in === 'path');
    const queryParams = params.filter(p => p.in === 'query');
    const headerParams = params.filter(p => p.in === 'header');

    let code = `import requests\nimport json\n\n`;
    code += `# ${operation.summary || `${method.toUpperCase()} ${path}`}\n\n`;

    // Path parameters
    if (pathParams.length > 0) {
      code += `# Path parameters\n`;
      pathParams.forEach(param => {
        code += `${this.toSnakeCase(param.name)} = "value"  # ${param.description || ''}\n`;
      });
      code += '\n';
    }

    // Build URL
    let urlPath = path;
    pathParams.forEach(param => {
      urlPath = urlPath.replace(`{${param.name}}`, `{${this.toSnakeCase(param.name)}}`);
    });

    code += `url = f"${baseUrl}${urlPath}"\n\n`;

    // Headers
    code += `headers = {\n`;
    code += `    "Content-Type": "application/json",\n`;
    if (includeAuth) {
      code += `    "Authorization": "Bearer YOUR_TOKEN",\n`;
    }
    headerParams.forEach(param => {
      code += `    "${param.name}": "value",  # ${param.description || ''}\n`;
    });
    code += `}\n\n`;

    // Query parameters
    if (queryParams.length > 0) {
      code += `# Query parameters\n`;
      code += `params = {\n`;
      queryParams.forEach(param => {
        code += `    "${param.name}": "value",  # ${param.description || ''}\n`;
      });
      code += `}\n\n`;
    }

    // Request body
    if (operation.requestBody) {
      code += `# Request body\n`;
      code += `data = {\n`;
      code += `    # Add request body here\n`;
      code += `}\n\n`;
    }

    // Make request
    code += `response = requests.${method.toLowerCase()}(\n`;
    code += `    url,\n`;
    code += `    headers=headers,\n`;
    if (queryParams.length > 0) {
      code += `    params=params,\n`;
    }
    if (operation.requestBody && method.toUpperCase() !== 'GET') {
      code += `    json=data,\n`;
    }
    code += `)\n\n`;

    code += `# Check response\n`;
    code += `if response.status_code == 200:\n`;
    code += `    result = response.json()\n`;
    code += `    print(json.dumps(result, indent=2))\n`;
    code += `else:\n`;
    code += `    print(f"Error: {response.status_code}")\n`;
    code += `    print(response.text)`;

    return code;
  }

  private generateCurlCode(
    path: string,
    method: string,
    operation: Operation,
    pathItem: PathItem,
    baseUrl: string,
    includeAuth?: boolean
  ): string {
    const params = this.extractParameters(operation, pathItem);
    const pathParams = params.filter(p => p.in === 'path');
    const queryParams = params.filter(p => p.in === 'query');
    const headerParams = params.filter(p => p.in === 'header');

    let code = `# ${operation.summary || `${method.toUpperCase()} ${path}`}\n\n`;

    // Build URL
    let urlPath = path;
    pathParams.forEach(param => {
      urlPath = urlPath.replace(`{${param.name}}`, `YOUR_${param.name.toUpperCase()}`);
    });

    code += `curl -X ${method.toUpperCase()} \\\n`;
    code += `  "${baseUrl}${urlPath}`;

    // Query parameters
    if (queryParams.length > 0) {
      code += '?';
      code += queryParams.map(param => `${param.name}=VALUE`).join('&');
    }
    code += `" \\\n`;

    // Headers
    code += `  -H "Content-Type: application/json" \\\n`;
    if (includeAuth) {
      code += `  -H "Authorization: Bearer YOUR_TOKEN" \\\n`;
    }
    headerParams.forEach(param => {
      code += `  -H "${param.name}: VALUE" \\\n`;
    });

    // Request body
    if (operation.requestBody && method.toUpperCase() !== 'GET') {
      code += `  -d '{\n`;
      code += `    "key": "value"\n`;
      code += `  }'`;
    }

    return code.trimEnd();
  }

  private generateAxiosCode(
    path: string,
    method: string,
    operation: Operation,
    pathItem: PathItem,
    baseUrl: string,
    includeAuth?: boolean
  ): string {
    const params = this.extractParameters(operation, pathItem);
    const pathParams = params.filter(p => p.in === 'path');
    const queryParams = params.filter(p => p.in === 'query');

    let code = `import axios from 'axios';\n\n`;
    code += `// ${operation.summary || `${method.toUpperCase()} ${path}`}\n\n`;

    // Path parameters
    if (pathParams.length > 0) {
      code += `// Path parameters\n`;
      pathParams.forEach(param => {
        code += `const ${this.toVariableName(param.name)} = 'value'; // ${param.description || ''}\n`;
      });
      code += '\n';
    }

    // Build URL
    let urlPath = path;
    pathParams.forEach(param => {
      urlPath = urlPath.replace(`{${param.name}}`, `\${${this.toVariableName(param.name)}}`);
    });

    code += `const url = \`${baseUrl}${urlPath}\`;\n\n`;

    // Config object
    code += `const config = {\n`;
    code += `  method: '${method.toLowerCase()}',\n`;
    code += `  url,\n`;
    code += `  headers: {\n`;
    code += `    'Content-Type': 'application/json',\n`;
    if (includeAuth) {
      code += `    'Authorization': 'Bearer YOUR_TOKEN',\n`;
    }
    code += `  },\n`;

    // Query parameters
    if (queryParams.length > 0) {
      code += `  params: {\n`;
      queryParams.forEach(param => {
        code += `    ${param.name}: 'value', // ${param.description || ''}\n`;
      });
      code += `  },\n`;
    }

    // Request body
    if (operation.requestBody && method.toUpperCase() !== 'GET') {
      code += `  data: {\n`;
      code += `    // Add request body here\n`;
      code += `  },\n`;
    }

    code += `};\n\n`;

    code += `try {\n`;
    code += `  const response = await axios(config);\n`;
    code += `  console.log(response.data);\n`;
    code += `} catch (error) {\n`;
    code += `  console.error('Error:', error.response?.data || error.message);\n`;
    code += `}`;

    return code;
  }

  private extractParameters(operation: Operation, pathItem: PathItem): Parameter[] {
    const params: Parameter[] = [];
    
    // Add path-level parameters
    if (pathItem.parameters) {
      params.push(...pathItem.parameters);
    }
    
    // Add operation-level parameters (they override path-level)
    if (operation.parameters) {
      operation.parameters.forEach(param => {
        const existingIndex = params.findIndex(p => p.name === param.name && p.in === param.in);
        if (existingIndex >= 0) {
          params[existingIndex] = param;
        } else {
          params.push(param);
        }
      });
    }
    
    return params;
  }

  private toVariableName(name: string): string {
    return name.replace(/[^a-zA-Z0-9]/g, '_').replace(/^(\d)/, '_$1');
  }

  private toFunctionName(name: string): string {
    return this.toVariableName(name).replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private toSnakeCase(name: string): string {
    return name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }

  private pathToName(path: string): string {
    return path
      .split('/')
      .filter(Boolean)
      .map(segment => segment.replace(/[{}]/g, ''))
      .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join('');
  }
}