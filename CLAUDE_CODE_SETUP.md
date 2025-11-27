# How to Use with Claude Code

Claude Code (the CLI tool you're using right now) requires MCP servers to be configured differently than Claude Desktop.

## Option 1: Direct Command Line Usage

Run Claude Code with your MCP server directly:

```bash
# Start Claude Code with your MCP server
claude --mcp "node /Users/vimalprakash/Documents/Projects/openapi-spec-mcp-server/dist/index.js --url https://crc-srv-827015814474.asia-south1.run.app/api-json"
```

## Option 2: Environment Variable Configuration

Set up an environment variable for easier usage:

```bash
# Add to your ~/.zshrc or ~/.bash_profile
export CLAUDE_MCP_SERVERS='{"openapi-crc":{"command":"node","args":["/Users/vimalprakash/Documents/Projects/openapi-spec-mcp-server/dist/index.js","--url","https://crc-srv-827015814474.asia-south1.run.app/api-json"]}}'

# Then just run
claude
```

## Option 3: Create a Claude Code Configuration File

Create a configuration file at `~/.claude/config.json`:

```bash
mkdir -p ~/.claude
```

Then create the config:

```json
{
  "mcpServers": {
    "openapi-crc": {
      "command": "node",
      "args": [
        "/Users/vimalprakash/Documents/Projects/openapi-spec-mcp-server/dist/index.js",
        "--url",
        "https://crc-srv-827015814474.asia-south1.run.app/api-json"
      ]
    }
  }
}
```

## Option 4: Using npx (Easiest for Claude Code)

Since Claude Code is a CLI tool, you can also run your MCP server as a global command:

```bash
# First, make your server globally accessible
cd /Users/vimalprakash/Documents/Projects/openapi-spec-mcp-server
npm link

# Then create a wrapper script
cat > ~/bin/openapi-mcp << 'EOF'
#!/bin/bash
node /Users/vimalprakash/Documents/Projects/openapi-spec-mcp-server/dist/index.js "$@"
EOF

chmod +x ~/bin/openapi-mcp

# Now you can use it with Claude Code
claude --mcp "openapi-mcp --url https://crc-srv-827015814474.asia-south1.run.app/api-json"
```

## Testing Your MCP Server in Claude Code

Once configured, you can test by asking Claude Code:

1. "What MCP servers are available?"
2. "Using the openapi-crc tools, list all available endpoints"
3. "Search for authentication endpoints in the API"
4. "Generate Python code for the POST /login endpoint"
5. "Show me the schema for the User model"

## Example Usage

After configuration, in a new Claude Code session:

```
You: List all the endpoints from my API using the openapi tools

Claude: [Uses list_endpoints tool to show all API endpoints]

You: Generate Python code to call the login endpoint

Claude: [Uses generate_code tool to create Python code]

You: Validate this request body for the user creation endpoint: {"name": "John", "email": "john@example.com"}

Claude: [Uses validate_request tool to check the request]
```

## Troubleshooting

1. **MCP server not found**: Make sure the path to dist/index.js is absolute
2. **URL not loading**: Check that your API endpoint is accessible
3. **Tools not appearing**: Restart Claude Code after configuration

## Quick Test

To quickly test if your MCP server works with Claude Code:

```bash
# Test the MCP server standalone
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | \
  node /Users/vimalprakash/Documents/Projects/openapi-spec-mcp-server/dist/index.js \
  --url https://crc-srv-827015814474.asia-south1.run.app/api-json
```

If you see a JSON response with tools listed, your server is ready!