#!/bin/bash

echo "Testing OpenAPI MCP Server with your API..."
echo ""

# Test list_tools request
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/index.js --url https://crc-srv-827015814474.asia-south1.run.app/api-json 2>/dev/null | head -1

echo ""
echo "If you see a JSON response with tools listed, the server is working!"
echo ""
echo "To use with Claude Desktop, add this to your config:"
echo "~/Library/Application Support/Claude/claude_desktop_config.json"