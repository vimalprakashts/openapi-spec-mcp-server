import { LRUCache } from 'lru-cache';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import { OpenAPISpec } from '../types/openapi';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export interface CacheEntry {
  spec: OpenAPISpec;
  etag?: string;
  lastModified?: string;
  timestamp: number;
  url: string;
}

export class CacheManager {
  private memoryCache: LRUCache<string, CacheEntry>;
  private cacheDir: string;
  private ttl: number;

  constructor(cacheDir: string, ttl: number, maxSize: number) {
    // Use absolute path for cache directory
    this.cacheDir = path.isAbsolute(cacheDir) 
      ? cacheDir 
      : path.join(os.homedir(), '.openapi-mcp-cache', cacheDir);
    this.ttl = ttl * 1000; // Convert to milliseconds
    
    // Initialize LRU cache with size limit
    this.memoryCache = new LRUCache<string, CacheEntry>({
      maxSize: maxSize * 1024 * 1024, // Convert MB to bytes
      ttl: this.ttl,
      sizeCalculation: (value) => {
        // Estimate size of the cached entry
        return JSON.stringify(value).length;
      },
      updateAgeOnGet: true,
      updateAgeOnHas: false,
    });

    // Ensure cache directory exists
    this.ensureCacheDir();
  }

  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private getCacheKey(url: string): string {
    return crypto.createHash('sha256').update(url).digest('hex');
  }

  private getDiskCachePath(url: string): string {
    const key = this.getCacheKey(url);
    return path.join(this.cacheDir, `${key}.json.gz`);
  }

  async get(url: string): Promise<CacheEntry | null> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(url);
    if (memoryEntry) {
      // Check if entry is still valid
      if (Date.now() - memoryEntry.timestamp < this.ttl) {
        return memoryEntry;
      }
      // Entry expired, remove it
      this.memoryCache.delete(url);
    }

    // Check disk cache
    const diskPath = this.getDiskCachePath(url);
    if (fs.existsSync(diskPath)) {
      try {
        const compressed = fs.readFileSync(diskPath);
        const decompressed = await gunzip(compressed);
        const entry: CacheEntry = JSON.parse(decompressed.toString());
        
        // Check if disk entry is still valid
        if (Date.now() - entry.timestamp < this.ttl) {
          // Load into memory cache for faster access
          this.memoryCache.set(url, entry);
          return entry;
        }
        
        // Entry expired, remove it
        fs.unlinkSync(diskPath);
      } catch (error) {
        console.error(`Failed to read cache from disk: ${error}`);
        // Remove corrupted cache file
        fs.unlinkSync(diskPath);
      }
    }

    return null;
  }

  async set(url: string, spec: OpenAPISpec, etag?: string, lastModified?: string): Promise<void> {
    const entry: CacheEntry = {
      spec,
      etag,
      lastModified,
      timestamp: Date.now(),
      url,
    };

    // Store in memory cache
    this.memoryCache.set(url, entry);

    // Store in disk cache
    try {
      const diskPath = this.getDiskCachePath(url);
      const data = JSON.stringify(entry);
      const compressed = await gzip(data);
      fs.writeFileSync(diskPath, compressed);
    } catch (error) {
      console.error(`Failed to write cache to disk: ${error}`);
    }
  }

  async invalidate(url: string): Promise<void> {
    // Remove from memory cache
    this.memoryCache.delete(url);

    // Remove from disk cache
    const diskPath = this.getDiskCachePath(url);
    if (fs.existsSync(diskPath)) {
      fs.unlinkSync(diskPath);
    }
  }

  async clear(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();

    // Clear disk cache
    const files = fs.readdirSync(this.cacheDir);
    for (const file of files) {
      if (file.endsWith('.json.gz')) {
        fs.unlinkSync(path.join(this.cacheDir, file));
      }
    }
  }

  getEtag(url: string): string | undefined {
    const entry = this.memoryCache.get(url);
    return entry?.etag;
  }

  getLastModified(url: string): string | undefined {
    const entry = this.memoryCache.get(url);
    return entry?.lastModified;
  }

  getCacheStats(): {
    memorySize: number;
    memoryEntries: number;
    diskEntries: number;
  } {
    const diskFiles = fs.readdirSync(this.cacheDir)
      .filter(f => f.endsWith('.json.gz'));
    
    return {
      memorySize: this.memoryCache.calculatedSize || 0,
      memoryEntries: this.memoryCache.size,
      diskEntries: diskFiles.length,
    };
  }
}