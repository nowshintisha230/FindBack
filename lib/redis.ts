import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
  });

redis.on("error", () => {});

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const cacheSet = async (key: string, value: unknown, ttlSeconds: number) => {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {}
};

export const cacheDel = async (...keys: string[]) => {
  try {
    if (keys.length) await redis.del(...keys);
  } catch {}
};

export const rateLimit = async (key: string, limit: number, windowSeconds: number) => {
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    return count <= limit;
  } catch {
    return true;
  }
};