import Redis from "ioredis";
import { ConfigService } from "../config/ConfigService.js";

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: any, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export class RedisCacheService implements ICacheService {
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    const host = process.env.REDIS_HOST || "localhost";
    const port = parseInt(process.env.REDIS_PORT || "6379");
    
    this.redis = new Redis({
      host,
      port,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this.redis.on("error", (err) => {
      console.error("[Redis] Error:", err);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`[Redis] Get Error (${key}):`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    try {
      const stringified = JSON.stringify(value);
      await this.redis.set(key, stringified, "EX", ttlSeconds);
    } catch (error) {
      console.error(`[Redis] Set Error (${key}):`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error(`[Redis] Delete Error (${key}):`, error);
    }
  }
}
