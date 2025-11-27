#!/usr/bin/env node

/**
 * Test script to verify the MCP server is working
 * Run with: node test-server.js
 */

const { spawn } = require('child_process');

console.log('Testing OpenAPI MCP Server...\n');

// Test with Petstore API (a common test API)
const server = spawn('node', [
  'dist/index.js',
  '--url', 'https://petstore.swagger.io/v2/swagger.json'
], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Send a test request to list tools
const testRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {}
};

setTimeout(() => {
  server.stdin.write(JSON.stringify(testRequest) + '\n');
}, 1000);

server.stdout.on('data', (data) => {
  console.log('Server response:', data.toString());
});

server.stderr.on('data', (data) => {
  console.log('Server log:', data.toString());
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});

// Kill server after 5 seconds
setTimeout(() => {
  console.log('\nStopping test server...');
  server.kill();
}, 5000);