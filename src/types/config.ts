import { z } from 'zod';

export const ConfigSchema = z.object({
  openApiUrl: z.string().url().optional(),
  cacheTtl: z.number().min(0).default(3600),
  cacheDir: z.string().default('.cache'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  maxCacheSize: z.number().min(1).default(100), // MB
  requestTimeout: z.number().min(1000).default(30000), // ms
  retryAttempts: z.number().min(0).default(3),
  retryDelay: z.number().min(100).default(1000), // ms
});

export type Config = z.infer<typeof ConfigSchema>;

export interface CliOptions {
  url?: string;
  cacheTtl?: number;
  cacheDir?: string;
  logLevel?: string;
  maxCacheSize?: number;
  requestTimeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}