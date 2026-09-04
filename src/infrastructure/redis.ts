import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

let redisClient: RedisClient | null = null;

/**
 * Get or create Redis client
 */
export async function getRedisClient(): Promise<RedisClient> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  client.on('error', (err) => {
    console.error('Redis client error:', err);
  });

  try {
    await client.connect();
    redisClient = client;
    console.log('Redis connected successfully');
    return client;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    throw error;
  }
}

/**
 * Get daily spending for an agent on a given date
 */
export async function getDailySpend(agentId: string, date: Date): Promise<number> {
  const client = await getRedisClient();
  const key = `spend:daily:${agentId}:${date.toISOString().split('T')[0]}`;
  const value = await client.get(key);
  return value ? parseFloat(value) : 0;
}

/**
 * Increment daily spending for an agent atomically
 */
export async function incrementDailySpend(
  agentId: string,
  amount: number,
  date: Date
): Promise<number> {
  try {
    const client = await getRedisClient();
    const key = `spend:daily:${agentId}:${date.toISOString().split('T')[0]}`;
    
    // Set expiry to 23:59:59 tomorrow
    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const ttlSeconds = Math.floor((tomorrow.getTime() - Date.now()) / 1000);
    
    const newValue = await client.incrByFloat(key, amount);
    if (ttlSeconds > 0) {
      await client.expire(key, ttlSeconds);
    }
    return Number(newValue);
  } catch (error) {
    console.error('Error incrementing daily spend:', error);
    throw error;
  }
}

/**
 * Get weekly spending for an agent
 */
export async function getWeeklySpend(agentId: string, date: Date): Promise<number> {
  const client = await getRedisClient();
  const weekStart = getWeekStart(date);
  const key = `spend:weekly:${agentId}:${weekStart.toISOString().split('T')[0]}`;
  const value = await client.get(key);
  return value ? parseFloat(value) : 0;
}

/**
 * Increment weekly spending atomically
 */
export async function incrementWeeklySpend(
  agentId: string,
  amount: number,
  date: Date
): Promise<number> {
  try {
    const client = await getRedisClient();
    const weekStart = getWeekStart(date);
    const key = `spend:weekly:${agentId}:${weekStart.toISOString().split('T')[0]}`;
    
    // Set expiry to end of week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setHours(0, 0, 0, 0);
    const ttlSeconds = Math.floor((weekEnd.getTime() - Date.now()) / 1000);
    
    const newValue = await client.incrByFloat(key, amount);
    if (ttlSeconds > 0) {
      await client.expire(key, ttlSeconds);
    }
    return Number(newValue);
  } catch (error) {
    console.error('Error incrementing weekly spend:', error);
    throw error;
  }
}

/**
 * Get monthly spending for an agent
 */
export async function getMonthlySpend(agentId: string, date: Date): Promise<number> {
  const client = await getRedisClient();
  const monthStart = getMonthStart(date);
  const key = `spend:monthly:${agentId}:${monthStart.toISOString().slice(0, 7)}`;
  const value = await client.get(key);
  return value ? parseFloat(value) : 0;
}

/**
 * Increment monthly spending atomically
 */
export async function incrementMonthlySpend(
  agentId: string,
  amount: number,
  date: Date
): Promise<number> {
  try {
    const client = await getRedisClient();
    const monthStart = getMonthStart(date);
    const key = `spend:monthly:${agentId}:${monthStart.toISOString().slice(0, 7)}`;
    
    // Set expiry to start of next month
    const nextMonth = new Date(monthStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const ttlSeconds = Math.floor((nextMonth.getTime() - Date.now()) / 1000);
    
    const newValue = await client.incrByFloat(key, amount);
    if (ttlSeconds > 0) {
      await client.expire(key, ttlSeconds);
    }
    return Number(newValue);
  } catch (error) {
    console.error('Error incrementing monthly spend:', error);
    throw error;
  }
}

/**
 * Get spending context for an agent (all time periods)
 */
export async function getSpendingContext(agentId: string, date: Date = new Date()) {
  try {
    const daily = await getDailySpend(agentId, date);
    const weekly = await getWeeklySpend(agentId, date);
    const monthly = await getMonthlySpend(agentId, date);

    return {
      dailySpent: daily,
      weeklySpent: weekly,
      monthlySpent: monthly,
      lastReset: {
        daily: new Date(date.toISOString().split('T')[0]),
        weekly: getWeekStart(date),
        monthly: getMonthStart(date),
      },
    };
  } catch (error) {
    console.error('Error getting spending context:', error);
    throw new Error('Could not retrieve spending context. Human approval required.');
  }
}

/**
 * Clear spending counters (for testing/resetting)
 */
export async function clearSpendingCounters(agentId: string): Promise<void> {
  try {
    const client = await getRedisClient();
    const pattern = `spend:*:${agentId}:*`;
    for await (const keys of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      if (keys.length) await client.del(keys);
    }
  } catch (error) {
    console.error('Error clearing spending counters:', error);
  }
}

// Helper functions
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

function getMonthStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
  }
}
