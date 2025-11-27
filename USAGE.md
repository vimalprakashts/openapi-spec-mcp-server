# Usage Examples

## Quick Start

### 1. Install and Build

```bash
npm install
npm run build
```

### 2. Run the Server

```bash
# Using a public API (Petstore example)
node dist/index.js --url https://petstore.swagger.io/v2/swagger.json

# Using your own API
node dist/index.js --url https://your-api.com/openapi.json
```

## Integration with Claude Desktop

### macOS Configuration

1. Open Claude Desktop configuration:
```bash
open ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

2. Add the MCP server configuration:
```json
{
  "mcpServers": {
    "openapi": {
      "command": "node",
      "args": [
        "/Users/YOUR_USERNAME/Documents/Projects/openapi-spec-mcp-server/dist/index.js",
        "--url",
        "YOUR_OPENAPI_URL"
      ]
    }
  }
}
```

3. Restart Claude Desktop

## Example Tool Usage in Claude

Once configured, you can use these commands in Claude:

### List all endpoints
"Use the openapi tools to list all available endpoints"

### Search for user-related endpoints
"Search for endpoints related to 'user' in the API"

### Get details about a specific endpoint
"Get details about the GET /users/{id} endpoint"

### Generate Python code
"Generate Python code to call the POST /users endpoint"

### Validate a request
"Validate this request body for POST /users: {name: 'John', email: 'john@example.com'}"

## Configuration Options

### Command Line Arguments

```bash
node dist/index.js \
  --url https://api.example.com/openapi.json \
  --cache-ttl 7200 \              # Cache for 2 hours
  --cache-dir ./my-cache \        # Custom cache directory
  --log-level debug \             # Verbose logging
  --max-cache-size 200 \          # 200MB cache
  --request-timeout 60000 \       # 60 second timeout
  --retry-attempts 5 \            # 5 retry attempts
  --retry-delay 2000              # 2 second retry delay
```

### Environment Variables

```bash
export OPENAPI_URL=https://api.example.com/openapi.json
export CACHE_TTL=7200
export LOG_LEVEL=debug
node dist/index.js
```

### Configuration File

Create `openapi-mcp.config.json`:

```json
{
  "openApiUrl": "https://api.example.com/openapi.json",
  "cacheTtl": 7200,
  "cacheDir": "./cache",
  "logLevel": "debug",
  "maxCacheSize": 200,
  "requestTimeout": 60000,
  "retryAttempts": 5,
  "retryDelay": 2000
}
```

## Common Use Cases

### 1. Exploring a New API

```
1. List all endpoints to get an overview
2. Search for specific functionality
3. Get detailed information about relevant endpoints
4. Generate code snippets in your preferred language
```

### 2. Validating API Requests

```
1. Get endpoint details to understand requirements
2. Validate your request data before sending
3. Check for required parameters and correct types
```

### 3. Code Generation

```
1. Find the endpoint you need
2. Generate code in your language (Python, JavaScript, etc.)
3. Customize with authentication if needed
```

## Troubleshooting

### Server won't start
- Check that the OpenAPI URL is accessible
- Verify the OpenAPI spec is valid (version 3.x)
- Check network connectivity

### Tools not appearing in Claude
- Restart Claude Desktop after configuration
- Check the configuration file syntax
- Verify the server path is correct

### Cache issues
- Clear cache: `rm -rf .cache`
- Use `--cache-ttl 0` to disable caching
- Check disk space for cache directory

## Supported OpenAPI Features

- OpenAPI 3.0.x and 3.1.x
- JSON and YAML formats
- $ref resolution
- Authentication schemes
- Request/response schemas
- Parameter validation
- Deprecated endpoint handling

## Performance Tips

1. **Use caching**: Default TTL is 1 hour, adjust based on your needs
2. **Limit search results**: Use the `limit` parameter for large APIs
3. **Filter endpoints**: Use tags and methods to narrow results
4. **Local specs**: For frequently used APIs, consider hosting the spec locally