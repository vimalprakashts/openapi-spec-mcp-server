# Claude CLI Usage Guide

## ✅ Your MCP Server is Now Connected!

The OpenAPI MCP server has been successfully added to Claude CLI. Here's how to use it:

## Basic Usage

### Interactive Mode
```bash
# Start Claude CLI in interactive mode
claude

# Then ask questions about your API:
> List all endpoints from the openapi-crc server
> Search for authentication endpoints
> Generate Python code for the login endpoint
> Show me the structure of the user registration endpoint
```

### Non-Interactive Mode (Direct Commands)
```bash
# List all endpoints
claude --print "Using the openapi-crc tools, list all API endpoints"

# Search for specific endpoints
claude --print "Search for 'auth' endpoints using the openapi-crc tools"

# Generate code
claude --print "Generate Python code for POST /login using the openapi-crc tools"

# Get endpoint details
claude --print "Show me the request and response structure for POST /users using openapi-crc"
```

## Available Tools from Your Server

Your `openapi-crc` server provides these tools:

1. **list_endpoints** - List all API endpoints with filtering
2. **get_endpoint_details** - Get complete endpoint info (request/response structure)
3. **search_endpoints** - Search for specific endpoints
4. **get_schemas** - View data models
5. **generate_code** - Generate code in multiple languages
6. **validate_request** - Validate request data
7. **get_api_info** - Get API metadata
8. **refresh_spec** - Refresh the cached spec

## Example Commands

### Get API Overview
```bash
claude --print "Use get_api_info from openapi-crc to show API information"
```

### List Endpoints with Filtering
```bash
claude --print "List only POST endpoints using openapi-crc"
```

### Generate Code in Different Languages
```bash
# Python
claude --print "Generate Python code for the login endpoint using openapi-crc"

# JavaScript
claude --print "Generate JavaScript fetch code for user registration using openapi-crc"

# cURL
claude --print "Generate a cURL command for the GET /users endpoint using openapi-crc"
```

### Get Complete Endpoint Structure
```bash
claude --print "Show the complete input parameters, data types, and response structure for POST /login using openapi-crc"
```

### Validate Requests
```bash
claude --print "Using openapi-crc, validate this request for POST /users: {email: 'test@example.com', name: 'John'}"
```

## Managing the MCP Server

### Check Server Status
```bash
claude mcp list
```

### Remove Server (if needed)
```bash
claude mcp remove openapi-crc
```

### Re-add Server
```bash
claude mcp add openapi-crc -- node /Users/vimalprakash/Documents/Projects/openapi-spec-mcp-server/dist/index.js --url https://crc-srv-827015814474.asia-south1.run.app/api-json
```

## Tips

1. **Always mention the tool name** - Include "openapi-crc" or "using openapi-crc tools" in your prompts
2. **Be specific** - Ask for specific endpoints or operations
3. **Use --print for scripts** - Add `--print` flag for non-interactive use
4. **Check logs if issues** - Logs are in `~/.claude/logs/`

## Your API Details

- **Server Name**: openapi-crc
- **API URL**: https://crc-srv-827015814474.asia-south1.run.app/api-json
- **Status**: ✓ Connected

## Quick Test

Try this command to verify everything works:
```bash
claude --print "List the first 5 endpoints from openapi-crc"
```

The server is ready to use with Claude CLI!