import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import * as yaml from 'yaml';
import $RefParser from '@apidevtools/json-schema-ref-parser';
import { OpenAPISpec } from '../types/openapi';
import { CacheManager } from './cache-manager';

export class OpenAPIClient {
  private cacheManager: CacheManager;
  private requestTimeout: number;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(
    cacheManager: CacheManager,
    requestTimeout: number = 30000,
    retryAttempts: number = 3,
    retryDelay: number = 1000
  ) {
    this.cacheManager = cacheManager;
    this.requestTimeout = requestTimeout;
    this.retryAttempts = retryAttempts;
    this.retryDelay = retryDelay;
  }

  async fetchSpec(url: string, forceRefresh: boolean = false): Promise<OpenAPISpec> {
    // Check cache first unless force refresh is requested
    if (!forceRefresh) {
      const cached = await this.cacheManager.get(url);
      if (cached) {
        console.error(`Using cached OpenAPI spec for ${url}`);
        return cached.spec;
      }
    }

    console.error(`Fetching OpenAPI spec from ${url}`);
    
    // Prepare request headers
    const headers: Record<string, string> = {
      'Accept': 'application/json, application/yaml, text/yaml, text/plain',
    };

    // Add conditional request headers if we have cached data
    const etag = this.cacheManager.getEtag(url);
    const lastModified = this.cacheManager.getLastModified(url);
    
    if (etag) {
      headers['If-None-Match'] = etag;
    }
    if (lastModified) {
      headers['If-Modified-Since'] = lastModified;
    }

    try {
      const response = await this.fetchWithRetry(url, {
        timeout: this.requestTimeout,
        headers,
        validateStatus: (status) => status < 400 || status === 304,
      });

      // If not modified, return cached version
      if (response.status === 304) {
        console.error(`OpenAPI spec not modified, using cached version`);
        const cached = await this.cacheManager.get(url);
        if (cached) {
          return cached.spec;
        }
      }

      // Parse the response
      const spec = await this.parseResponse(response);
      
      // Resolve all $ref references
      const resolvedSpec = await this.resolveReferences(spec, url);
      
      // Validate the spec
      this.validateSpec(resolvedSpec);
      
      // Cache the spec
      const responseEtag = response.headers['etag'];
      const responseLastModified = response.headers['last-modified'];
      await this.cacheManager.set(url, resolvedSpec, responseEtag, responseLastModified);
      
      return resolvedSpec;
    } catch (error) {
      // If we have a cached version and the request failed, return the cached version
      const cached = await this.cacheManager.get(url);
      if (cached) {
        console.warn(`Failed to fetch updated spec, using cached version: ${error}`);
        return cached.spec;
      }
      
      throw new Error(`Failed to fetch OpenAPI spec: ${error}`);
    }
  }

  private async fetchWithRetry(
    url: string,
    config: AxiosRequestConfig
  ): Promise<AxiosResponse> {
    let lastError: any;
    
    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        return await axios.get(url, config);
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on client errors (4xx)
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          throw error;
        }
        
        // Wait before retrying
        if (attempt < this.retryAttempts - 1) {
          console.error(`Request failed, retrying in ${this.retryDelay}ms (attempt ${attempt + 1}/${this.retryAttempts}`);
          await this.delay(this.retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }
    
    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async parseResponse(response: AxiosResponse): Promise<any> {
    const contentType = response.headers['content-type'] || '';
    const data = response.data;

    // If already parsed as JSON
    if (typeof data === 'object' && data !== null) {
      return data;
    }

    // Parse based on content type or try both formats
    if (contentType.includes('yaml') || contentType.includes('yml')) {
      return yaml.parse(data);
    } else if (contentType.includes('json')) {
      return typeof data === 'string' ? JSON.parse(data) : data;
    } else {
      // Try to detect format
      const trimmed = data.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        return JSON.parse(trimmed);
      } else {
        return yaml.parse(trimmed);
      }
    }
  }

  private async resolveReferences(spec: any, _baseUrl: string): Promise<OpenAPISpec> {
    try {
      // Use json-schema-ref-parser to resolve all $ref references
      const resolved = await $RefParser.dereference(spec, {
        resolve: {
          http: {
            read: async (file: any) => {
              const url = typeof file === 'string' ? file : file.url;
              const response = await this.fetchWithRetry(url, {
                timeout: this.requestTimeout,
              });
              return this.parseResponse(response);
            },
          },
        },
      });

      return resolved as OpenAPISpec;
    } catch (error) {
      console.error(`Failed to fully resolve references: ${error}`);
      // Return the spec as-is if reference resolution fails
      return spec as OpenAPISpec;
    }
  }

  private validateSpec(spec: OpenAPISpec): void {
    // Basic validation - support both OpenAPI 3.x and Swagger 2.0
    const version = (spec as any).openapi || (spec as any).swagger;

    if (!version) {
      throw new Error('Invalid spec: missing version field (openapi or swagger)');
    }

    // Check if it's Swagger 2.0
    if ((spec as any).swagger) {
      if (!(spec as any).swagger.startsWith('2.')) {
        throw new Error(`Unsupported Swagger version: ${(spec as any).swagger}. Only Swagger 2.x and OpenAPI 3.x are supported.`);
      }
      console.error(`Warning: This is a Swagger 2.0 spec. Consider upgrading to OpenAPI 3.x for better compatibility.`);
      // Add openapi field for compatibility
      (spec as any).openapi = '3.0.0';
    } else if (!spec.openapi.startsWith('3.')) {
      throw new Error(`Unsupported OpenAPI version: ${spec.openapi}. Only OpenAPI 3.x is supported.`);
    }

    if (!spec.info) {
      throw new Error('Invalid spec: missing info object');
    }

    if (!spec.paths || Object.keys(spec.paths).length === 0) {
      console.error('Warning: Spec has no paths defined');
    }
  }

  async fetchFromUrl(url: string): Promise<OpenAPISpec> {
    return this.fetchSpec(url, false);
  }

  async refreshSpec(url: string): Promise<OpenAPISpec> {
    return this.fetchSpec(url, true);
  }
}