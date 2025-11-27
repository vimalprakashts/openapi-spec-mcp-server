import { Config, ConfigSchema, CliOptions } from '../types/config';
import * as fs from 'fs';
import * as path from 'path';

export class ConfigManager {
  private config: Config;

  constructor(cliOptions?: CliOptions) {
    this.config = this.loadConfig(cliOptions);
  }

  private loadConfig(cliOptions?: CliOptions): Config {
    // Start with default values
    let config: Partial<Config> = {};

    // Load from environment variables
    if (process.env.OPENAPI_URL) {
      config.openApiUrl = process.env.OPENAPI_URL;
    }
    if (process.env.CACHE_TTL) {
      config.cacheTtl = parseInt(process.env.CACHE_TTL, 10);
    }
    if (process.env.CACHE_DIR) {
      config.cacheDir = process.env.CACHE_DIR;
    }
    if (process.env.LOG_LEVEL) {
      config.logLevel = process.env.LOG_LEVEL as Config['logLevel'];
    }
    if (process.env.MAX_CACHE_SIZE) {
      config.maxCacheSize = parseInt(process.env.MAX_CACHE_SIZE, 10);
    }
    if (process.env.REQUEST_TIMEOUT) {
      config.requestTimeout = parseInt(process.env.REQUEST_TIMEOUT, 10);
    }
    if (process.env.RETRY_ATTEMPTS) {
      config.retryAttempts = parseInt(process.env.RETRY_ATTEMPTS, 10);
    }
    if (process.env.RETRY_DELAY) {
      config.retryDelay = parseInt(process.env.RETRY_DELAY, 10);
    }

    // Load from config file if exists
    const configFilePath = path.join(process.cwd(), 'openapi-mcp.config.json');
    if (fs.existsSync(configFilePath)) {
      try {
        const fileConfig = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
        config = { ...config, ...fileConfig };
      } catch (error) {
        console.warn(`Failed to load config file: ${error}`);
      }
    }

    // Override with CLI options
    if (cliOptions) {
      if (cliOptions.url) config.openApiUrl = cliOptions.url;
      if (cliOptions.cacheTtl !== undefined) config.cacheTtl = cliOptions.cacheTtl;
      if (cliOptions.cacheDir) config.cacheDir = cliOptions.cacheDir;
      if (cliOptions.logLevel) config.logLevel = cliOptions.logLevel as Config['logLevel'];
      if (cliOptions.maxCacheSize !== undefined) config.maxCacheSize = cliOptions.maxCacheSize;
      if (cliOptions.requestTimeout !== undefined) config.requestTimeout = cliOptions.requestTimeout;
      if (cliOptions.retryAttempts !== undefined) config.retryAttempts = cliOptions.retryAttempts;
      if (cliOptions.retryDelay !== undefined) config.retryDelay = cliOptions.retryDelay;
    }

    // Validate and apply defaults
    return ConfigSchema.parse(config);
  }

  getConfig(): Config {
    return this.config;
  }

  get openApiUrl(): string | undefined {
    return this.config.openApiUrl;
  }

  get cacheTtl(): number {
    return this.config.cacheTtl;
  }

  get cacheDir(): string {
    return this.config.cacheDir;
  }

  get logLevel(): Config['logLevel'] {
    return this.config.logLevel;
  }

  get maxCacheSize(): number {
    return this.config.maxCacheSize;
  }

  get requestTimeout(): number {
    return this.config.requestTimeout;
  }

  get retryAttempts(): number {
    return this.config.retryAttempts;
  }

  get retryDelay(): number {
    return this.config.retryDelay;
  }

  updateUrl(url: string): void {
    this.config.openApiUrl = url;
  }
}