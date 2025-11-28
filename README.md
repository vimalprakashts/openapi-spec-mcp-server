# Vims OpenAPI MCP Server

A Model Context Protocol (MCP) server that provides tools for interacting with OpenAPI specifications. This server allows Claude and other MCP clients to dynamically fetch, explore, and generate code from OpenAPI specs without loading the entire specification into context.

## Features

- **Dynamic Spec Loading**: Fetch OpenAPI specifications from any URL
- **Intelligent Caching**: LRU memory cache + persistent disk cache with compression
- **Comprehensive Tools**: 
  - List and search endpoints
  - Get detailed endpoint information
  - Explore schema definitions
  - Generate code snippets in multiple languages
  - Validate requests against schemas
  - Get API metadata and statistics
- **Multiple Language Support**: Generate code in JavaScript, TypeScript, Python, cURL, and Axios
- **Request Validation**: Validate request parameters and bodies against OpenAPI schemas
- **Fuzzy Search**: Search endpoints using fuzzy matching across multiple fields

## Installation

```bash
# Clone the repository
git clone https://github.com/vimalprakashts/openapi-spec-mcp-server.git
cd openapi-spec-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Command Line

```bash
# Run with npx (recommended)
npx vims-openapi-mcp --url https://api.example.com/openapi.json

# Run with custom cache settings
npx vims-openapi-mcp --url https://api.example.com/openapi.json --cache-ttl 7200 --cache-dir ./my-cache

# Run with all options
npx vims-openapi-mcp \
  --url https://api.example.com/openapi.json \
  --cache-ttl 3600 \
  --cache-dir .cache \
  --log-level info \
  --max-cache-size 100 \
  --request-timeout 30000 \
  --retry-attempts 3 \
  --retry-delay 1000
```

### Environment Variables

```bash
export OPENAPI_URL=https://api.example.com/openapi.json
export CACHE_TTL=3600
export CACHE_DIR=.cache
export LOG_LEVEL=info
export MAX_CACHE_SIZE=100
export REQUEST_TIMEOUT=30000
export RETRY_ATTEMPTS=3
export RETRY_DELAY=1000

node dist/index.js
```

### Configuration File

Create an `openapi-mcp.config.json` file in your project root:

```json
{
  "openApiUrl": "https://api.example.com/openapi.json",
  "cacheTtl": 3600,
  "cacheDir": ".cache",
  "logLevel": "info",
  "maxCacheSize": 100,
  "requestTimeout": 30000,
  "retryAttempts": 3,
  "retryDelay": 1000
}
```

## Available MCP Tools

### 1. `list_endpoints`
List all available API endpoints with optional filtering.

**Parameters:**
- `tag` (string, optional): Filter by tag
- `method` (string, optional): Filter by HTTP method
- `deprecated` (boolean, optional): Include/exclude deprecated endpoints
- `limit` (number, optional): Maximum results (default: 100)
- `offset` (number, optional): Skip results (default: 0)

**Example:**
```json
{
  "tool": "list_endpoints",
  "arguments": {
    "method": "GET",
    "limit": 20
  }
}
```

### 2. `get_endpoint_details`
Get detailed information about a specific endpoint.

**Parameters:**
- `path` (string, required): The API endpoint path
- `method` (string, required): The HTTP method

**Example:**
```json
{
  "tool": "get_endpoint_details",
  "arguments": {
    "path": "/users/{id}",
    "method": "GET"
  }
}
```

### 3. `search_endpoints`
Search for endpoints using fuzzy matching.

**Parameters:**
- `query` (string, required): Search query
- `searchIn` (array, optional): Fields to search in
- `limit` (number, optional): Maximum results (default: 20)

**Example:**
```json
{
  "tool": "search_endpoints",
  "arguments": {
    "query": "user",
    "searchIn": ["path", "summary"]
  }
}
```

### 4. `get_schemas`
Get schema definitions from the OpenAPI spec.

**Parameters:**
- `schemaName` (string, optional): Specific schema name
- `listAll` (boolean, optional): List all schema names

**Example:**
```json
{
  "tool": "get_schemas",
  "arguments": {
    "schemaName": "User"
  }
}
```

### 5. `generate_code`
Generate code snippets for API endpoints.

**Parameters:**
- `path` (string, required): The API endpoint path
- `method` (string, required): The HTTP method
- `language` (string, required): Programming language (javascript, typescript, python, curl, axios)
- `includeAuth` (boolean, optional): Include authentication
- `baseUrl` (string, optional): Override base URL

**Example:**
```json
{
  "tool": "generate_code",
  "arguments": {
    "path": "/users/{id}",
    "method": "GET",
    "language": "python",
    "includeAuth": true
  }
}
```

### 6. `validate_request`
Validate a request against the OpenAPI schema.

**Parameters:**
- `path` (string, required): The API endpoint path
- `method` (string, required): The HTTP method
- `params` (object, optional): Query and path parameters
- `headers` (object, optional): Request headers
- `body` (any, optional): Request body

**Example:**
```json
{
  "tool": "validate_request",
  "arguments": {
    "path": "/users",
    "method": "POST",
    "body": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

### 7. `get_api_info`
Get general information about the API.

**Parameters:** None

**Example:**
```json
{
  "tool": "get_api_info",
  "arguments": {}
}
```

### 8. `refresh_spec`
Refresh the OpenAPI specification from the server.

**Parameters:**
- `url` (string, optional): URL to fetch from (uses configured URL if not provided)

**Example:**
```json
{
  "tool": "refresh_spec",
  "arguments": {
    "url": "https://api.example.com/openapi.json"
  }
}
```

## Integration with Claude Desktop

Add this server to your Claude Desktop configuration:

### macOS
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "openapi": {
      "command": "npx",
      "args": ["vims-openapi-mcp", "--url", "https://api.example.com/openapi.json"]
    }
  }
}
```

### Windows
Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "openapi": {
      "command": "npx",
      "args": ["vims-openapi-mcp", "--url", "https://api.example.com/openapi.json"]
    }
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Clean build artifacts
npm run clean
```

## Architecture

### Core Components

1. **MCP Server Core** (`src/core/mcp-server.ts`)
   - Handles MCP protocol communication
   - Manages tool registration and execution
   - Coordinates spec loading and caching

2. **OpenAPI Client** (`src/core/openapi-client.ts`)
   - Fetches specs from URLs
   - Handles retries and error recovery
   - Resolves $ref references
   - Validates OpenAPI format

3. **Cache Manager** (`src/core/cache-manager.ts`)
   - LRU memory cache for hot data
   - Compressed disk cache for persistence
   - ETag/Last-Modified support for conditional requests
   - Automatic cache invalidation

4. **Tools** (`src/tools/`)
   - Modular tool implementations
   - Base tool class for consistency
   - Schema validation and error handling

### Caching Strategy

- **Memory Cache**: Fast access to frequently used specs
- **Disk Cache**: Persistent storage with gzip compression
- **HTTP Caching**: Respects ETags and Last-Modified headers
- **TTL-based Expiration**: Configurable cache lifetime

## Supported Versions

- Swagger 2.0 (automatically converted for compatibility)
- OpenAPI 3.0.x
- OpenAPI 3.1.x

## Error Handling

The server implements comprehensive error handling:
- Network errors with exponential backoff retry
- Graceful degradation when specs are partially invalid
- Cached fallback when network is unavailable
- Detailed error messages for debugging

## Performance Optimizations

- Lazy loading of spec sections
- Efficient fuzzy search with Fuse.js
- Request deduplication
- Connection pooling for HTTP requests
- Compressed cache storage

## Security Considerations

- URL validation and sanitization
- Request timeout limits
- Safe JSON/YAML parsing
- No execution of arbitrary code
- Secure handling of authentication tokens

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT

## Support

For issues, questions, or suggestions, please open an issue on GitHub.