# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenAPI Specification MCP Server - A Model Context Protocol (MCP) server that provides tools for interacting with OpenAPI specifications. Allows Claude and other MCP clients to dynamically fetch, explore, and generate code from OpenAPI specs without loading the entire specification into context.

## Build and Development Commands

```bash
# Install dependencies
npm install

# Development with hot reload
npm run dev

# Build for production
npm run build

# Run built server
npm start

# Run tests
npm test

# Clean build artifacts
npm run clean
```

## Running the Server

The server requires an OpenAPI specification URL. Configuration can be provided via:
1. Command line: `--url <url>`
2. Environment variable: `OPENAPI_URL=<url>`
3. Config file: `openapi-mcp.config.json`

Example: `node dist/index.js --url https://api.example.com/openapi.json`

## Architecture

### Core Components

**OpenAPIMCPServer** (`src/core/mcp-server.ts`):
- Central orchestrator that manages the MCP protocol communication
- Handles tool registration (8 tools total) and execution routing
- Maintains `currentSpec` (loaded OpenAPI spec) and `currentUrl` state
- Automatically loads spec on first tool use if not already loaded
- Tools are stored in a Map and executed dynamically based on tool name

**OpenAPIClient** (`src/core/openapi-client.ts`):
- Fetches OpenAPI specs from URLs with retry logic and timeout handling
- Resolves `$ref` references within specs (internal and external references)
- Validates OpenAPI format (supports OpenAPI 3.0.x and 3.1.x)
- Integrates with CacheManager for efficient spec retrieval

**CacheManager** (`src/core/cache-manager.ts`):
- Two-tier caching: LRU memory cache for hot data + gzip-compressed disk cache for persistence
- Respects HTTP caching headers (ETags, Last-Modified) for conditional requests
- TTL-based expiration (configurable via `cacheTtl`)
- Automatic cache size management with configurable `maxCacheSize` limit

**ConfigManager** (`src/config/index.ts`):
- Configuration priority order (highest to lowest): CLI options → Config file → Environment variables → Defaults
- Validates configuration using Zod schema defined in `src/types/config.ts`
- Loads from `openapi-mcp.config.json` in project root if present
- All config values accessible via getter methods

### Tool Architecture

**BaseTool** (`src/tools/base-tool.ts`):
- Abstract base class that all tools extend
- Enforces consistent interface: `name`, `description`, `schema`, `execute()` method
- Provides utility methods: `validateArgs()` for required field validation, `formatJson()` for consistent output
- All tools receive three parameters in `execute()`: args, spec (OpenAPISpec | null), url (string | null)

**Tool Implementations** (`src/tools/`):
- Each tool is a separate class file extending BaseTool
- Tools define their own JSON schema for argument validation
- Most tools require a loaded spec (except `refresh_spec`)
- The MCP server handles spec loading automatically before tool execution

**Available Tools**:
1. `list_endpoints` - List API endpoints with filtering (tag, method, deprecated status)
2. `get_endpoint_details` - Get detailed info for specific endpoint (path + method)
3. `search_endpoints` - Fuzzy search endpoints using Fuse.js across multiple fields
4. `get_schemas` - Get schema definitions (specific schema or list all)
5. `generate_code` - Generate code snippets (JavaScript, TypeScript, Python, cURL, Axios)
6. `validate_request` - Validate requests against OpenAPI schemas using AJV
7. `get_api_info` - Get API metadata and statistics (title, version, endpoint counts)
8. `refresh_spec` - Force refresh spec from server, bypassing cache

### Request Flow

1. Client calls tool via MCP protocol
2. MCP server receives request in `CallToolRequestSchema` handler (line 94 of mcp-server.ts)
3. Server checks if spec is loaded for tools requiring it (lines 98-148)
4. If not loaded, attempts to load from URL in args or config
5. Server retrieves tool from Map and calls `tool.execute(args, spec, url)`
6. Tool executes and returns result (string or object)
7. Server formats result as MCP response with text content

### Configuration System

Configuration is loaded in order of precedence:
1. CLI options (highest priority)
2. Config file (`openapi-mcp.config.json`)
3. Environment variables
4. Default values (lowest priority)

Configuration parameters:
- `openApiUrl`: URL to OpenAPI specification
- `cacheTtl`: Cache lifetime in seconds (default: 3600)
- `cacheDir`: Cache directory path (default: ".cache")
- `logLevel`: Logging level (debug, info, warn, error)
- `maxCacheSize`: Max cache size in MB (default: 100)
- `requestTimeout`: Request timeout in milliseconds (default: 30000)
- `retryAttempts`: Number of retry attempts (default: 3)
- `retryDelay`: Delay between retries in milliseconds (default: 1000)

## TypeScript Configuration

- Target: ES2022
- Module: CommonJS
- Strict mode enabled with all strict checks
- Output: `dist/` directory
- Source maps and declaration files generated

## Adding New Tools

1. Create new class extending BaseTool in `src/tools/`
2. Implement required properties: `name`, `description`, `schema`
3. Implement `execute()` method with signature: `(args: any, spec: OpenAPISpec | null, url: string | null) => Promise<any>`
4. Register tool in `OpenAPIMCPServer.registerTools()` method (line 65 of mcp-server.ts)
5. If tool requires spec, ensure tool name is added to `toolsRequiringSpec` array (line 98 of mcp-server.ts)
