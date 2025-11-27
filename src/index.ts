#!/usr/bin/env node

import { Command } from 'commander';
import { OpenAPIMCPServer } from './core/mcp-server';
import { ConfigManager } from './config';
import { CliOptions } from './types/config';

const program = new Command();

program
  .name('openapi-mcp-server')
  .description('MCP server for interacting with OpenAPI specifications')
  .version('1.0.0')
  .option('-u, --url <url>', 'OpenAPI specification URL')
  .option('--cache-ttl <seconds>', 'Cache TTL in seconds', parseInt)
  .option('--cache-dir <path>', 'Cache directory path')
  .option('--log-level <level>', 'Log level (debug, info, warn, error)')
  .option('--max-cache-size <mb>', 'Maximum cache size in MB', parseInt)
  .option('--request-timeout <ms>', 'Request timeout in milliseconds', parseInt)
  .option('--retry-attempts <count>', 'Number of retry attempts', parseInt)
  .option('--retry-delay <ms>', 'Delay between retries in milliseconds', parseInt)
  .action(async (options: CliOptions) => {
    try {
      // Initialize configuration
      const configManager = new ConfigManager(options);

      // Validate that we have a URL
      if (!configManager.openApiUrl && !options.url) {
        console.error('Error: OpenAPI URL is required. Provide it via:');
        console.error('  - Command line: --url <url>');
        console.error('  - Environment variable: OPENAPI_URL=<url>');
        console.error('  - Config file: openapi-mcp.config.json');
        process.exit(1);
      }

      // Create and run the MCP server
      const server = new OpenAPIMCPServer(configManager);
      
      // Handle shutdown gracefully
      process.on('SIGINT', () => {
        console.error('\nShutting down OpenAPI MCP Server...');
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        console.error('\nShutting down OpenAPI MCP Server...');
        process.exit(0);
      });

      // Run the server
      await server.run();
    } catch (error) {
      console.error('Failed to start OpenAPI MCP Server:', error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);