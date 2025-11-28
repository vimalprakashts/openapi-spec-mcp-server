# Using Vims OpenAPI MCP with Claude Code CLI

This guide shows you how to integrate and use the Vims OpenAPI MCP server with Claude Code CLI.

## Prerequisites

- Claude Code CLI installed (https://claude.com/code)
- Node.js installed
- An OpenAPI/Swagger specification URL

## Adding the MCP Server

### Option 1: Using Local Build (Development)

If you've cloned and built the project locally:

```bash
# Add the MCP server with a custom name
claude mcp add openapi-crc -- node /Users/vimalprakash/Documents/projects/openapi-spec-mcp-server/dist/index.js --url https://crc-srv-827015814474.asia-south1.run.app/api-json
```

**Syntax Breakdown:**
- `claude mcp add` - Command to add an MCP server
- `openapi-crc` - Custom name for your MCP server (can be anything)
- `--` - Separator between MCP config and the actual command
- `node /path/to/dist/index.js` - Command to run the server
- `--url https://...` - OpenAPI specification URL

### Option 2: Using npx (After Publishing)

Once published to npm, users can add it more simply:

```bash
# Add using npx (recommended for production)
claude mcp add openapi-prod -- npx vims-openapi-mcp --url https://api.example.com/openapi.json

# Or with a local API
claude mcp add openapi-local -- npx vims-openapi-mcp --url http://localhost:8080/swagger/doc.json
```

### Option 3: With Additional Configuration

You can add the server with custom cache and timeout settings:

```bash
claude mcp add openapi-custom -- npx vims-openapi-mcp --url https://api.example.com/openapi.json --cache-ttl 7200 --cache-dir ~/.cache/openapi-mcp --log-level debug --request-timeout 60000
```

## Managing MCP Servers

### List All MCP Servers

```bash
claude mcp list
```

This shows all configured MCP servers, including your `openapi-crc` server.

### Remove an MCP Server

```bash
claude mcp remove openapi-crc
```

### Check Server Status

```bash
claude mcp status openapi-crc
```

## Using the MCP Server in Claude Code

Once added, Claude Code automatically has access to 8 new tools from your OpenAPI spec:

### 1. List All Endpoints

```
List all available API endpoints
```

Claude will use the `list_endpoints` tool to show all endpoints from your API.

**Example prompts:**
- "Show me all the endpoints in the API"
- "List all GET endpoints"
- "What endpoints are available?"

### 2. Search for Endpoints

```
Search for user-related endpoints
```

Claude will use the `search_endpoints` tool with fuzzy matching.

**Example prompts:**
- "Find endpoints related to authentication"
- "Search for endpoints that handle orders"
- "Show me all endpoints with 'customer' in them"

### 3. Get Endpoint Details

```
Show me details about the GET /users/{id} endpoint
```

Claude will use the `get_endpoint_details` tool.

**Example prompts:**
- "What parameters does POST /api/orders accept?"
- "Show me the response schema for GET /products"
- "What are the authentication requirements for DELETE /users/{id}?"

### 4. Generate Code

```
Generate a Python client for the GET /users endpoint
```

Claude will use the `generate_code` tool.

**Example prompts:**
- "Generate a TypeScript function to call POST /api/orders"
- "Show me a cURL command for authenticating"
- "Create a JavaScript axios request for GET /products"
- "Generate Python code to fetch user data"

**Supported languages:**
- JavaScript
- TypeScript
- Python
- cURL
- Axios

### 5. Validate Requests

```
Check if this request is valid for POST /users:
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

Claude will use the `validate_request` tool to validate against the schema.

**Example prompts:**
- "Is this a valid request body for POST /orders?"
- "Validate these query parameters for GET /search"
- "Check if these headers are correct for this endpoint"

### 6. Explore Schemas

```
Show me the User schema definition
```

Claude will use the `get_schemas` tool.

**Example prompts:**
- "What fields are in the Order schema?"
- "List all available schemas"
- "Show me the structure of the Product model"

### 7. Get API Information

```
What API is this and what endpoints does it have?
```

Claude will use the `get_api_info` tool.

**Example prompts:**
- "Give me an overview of this API"
- "What version is this API?"
- "How many endpoints are available?"

### 8. Refresh Specification

```
Refresh the OpenAPI spec from the server
```

Claude will use the `refresh_spec` tool to bypass cache.

**Example prompts:**
- "Reload the API specification"
- "Get the latest version of the OpenAPI spec"
- "Refresh the cached spec"

## Complete Workflow Example

Here's a typical workflow using the MCP server:

```bash
# 1. Add the server
claude mcp add my-api -- npx vims-openapi-mcp --url https://api.example.com/openapi.json

# 2. Start Claude Code in your project
cd my-project
claude

# 3. In the chat, interact with your API:
```

**Chat conversation:**

```
You: What endpoints are available in the API?

Claude: Let me check the available endpoints...
[Uses list_endpoints tool]
I found 45 endpoints across 8 categories:
- Authentication (5 endpoints)
- Users (12 endpoints)
- Products (15 endpoints)
...

You: Show me how to create a new user

Claude: Let me get the details for the user creation endpoint...
[Uses get_endpoint_details on POST /users]
[Uses generate_code to create example]

Here's how to create a new user:

```typescript
async function createUser(userData: UserCreate) {
  const response = await fetch('https://api.example.com/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN'
    },
    body: JSON.stringify(userData)
  });
  return response.json();
}
```

You: Can you validate this request body for me?
{
  "name": "John"
}

Claude: [Uses validate_request tool]
This request is invalid. The User schema requires:
- email (required, missing)
- name (valid)
- age (optional)
```

## Multiple APIs

You can add multiple MCP servers for different APIs:

```bash
# Production API
claude mcp add api-prod -- npx vims-openapi-mcp --url https://api.example.com/openapi.json

# Staging API
claude mcp add api-staging -- npx vims-openapi-mcp --url https://staging-api.example.com/openapi.json

# Local development
claude mcp add api-local -- npx vims-openapi-mcp --url http://localhost:8080/swagger/doc.json
```

Claude will have access to all APIs simultaneously and can help you work with any of them.

## Configuration Options

All available command-line options:

| Option | Description | Default |
|--------|-------------|---------|
| `--url` | OpenAPI specification URL | Required |
| `--cache-ttl` | Cache TTL in seconds | 3600 |
| `--cache-dir` | Cache directory path | `.cache` |
| `--log-level` | Log level (debug, info, warn, error) | `info` |
| `--max-cache-size` | Maximum cache size in MB | 100 |
| `--request-timeout` | Request timeout in milliseconds | 30000 |
| `--retry-attempts` | Number of retry attempts | 3 |
| `--retry-delay` | Delay between retries in milliseconds | 1000 |

## Troubleshooting

### Server Not Starting

```bash
# Check server status
claude mcp status openapi-crc

# View server logs
claude mcp logs openapi-crc

# Try restarting
claude mcp remove openapi-crc
claude mcp add openapi-crc -- npx vims-openapi-mcp --url https://your-api.com/openapi.json
```

### Invalid OpenAPI URL

Make sure the URL is accessible and returns a valid OpenAPI/Swagger spec:

```bash
# Test the URL directly
curl https://your-api.com/openapi.json

# Or with browser
open https://your-api.com/openapi.json
```

### Swagger 2.0 Warning

If you see "This is a Swagger 2.0 spec" warning, the server will still work but you should consider upgrading to OpenAPI 3.x for better compatibility.

### Permission Denied

If using a local build, ensure the file is executable:

```bash
chmod +x /path/to/dist/index.js
```

## Environment Variables

Alternatively, you can use environment variables:

```bash
# Set environment variables
export OPENAPI_URL=https://api.example.com/openapi.json
export CACHE_TTL=7200
export LOG_LEVEL=debug

# Add server without URL flag
claude mcp add openapi-env -- npx vims-openapi-mcp
```

## Best Practices

1. **Use descriptive names**: Name your MCP servers clearly (e.g., `api-prod`, `api-staging`)
2. **Cache settings**: For frequently updated APIs, use shorter cache TTL
3. **Multiple environments**: Add separate servers for dev/staging/prod
4. **Log level**: Use `debug` during development, `info` or `warn` in production
5. **Timeout settings**: Increase timeout for slow APIs or large specs

## Example: Real-World Setup

```bash
# Production API with standard settings
claude mcp add shopify-prod -- npx vims-openapi-mcp --url https://api.shopify.com/openapi.json --cache-ttl 3600 --log-level info

# Local development with debug logging
claude mcp add my-api-local -- node ~/projects/my-api-mcp/dist/index.js --url http://localhost:3000/api-docs --cache-ttl 60 --log-level debug

# Verify both are running
claude mcp list
```

Now when you use Claude Code, you can say things like:
- "Using the shopify-prod API, show me how to create a product"
- "Check my local API and list all the endpoints"
- "Generate TypeScript types for the Order schema from the production API"

## Support

For issues or questions:
- GitHub Issues: https://github.com/vimalprakashts/openapi-spec-mcp-server/issues
- Documentation: See README.md and PUBLISHING.md
