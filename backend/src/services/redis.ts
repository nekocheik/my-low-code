// src/services/redis.ts

import { createClient } from '@redis/client';
import logger from '../utils/logger';

class RedisService {
  private static instance: RedisService;
  private client: ReturnType<typeof createClient>;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_INTERVAL = 1000; // 1 seconde

  private constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > this.MAX_RECONNECT_ATTEMPTS) {
            logger.error('Max reconnection attempts reached, giving up');
            return new Error('Max reconnection attempts reached');
          }
          return this.RECONNECT_INTERVAL;
        }
      }
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.client.on('error', (err) => {
      logger.error('Redis Client Error', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      logger.info('Redis Client Connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.client.on('reconnecting', () => {
      this.reconnectAttempts++;
      logger.info(`Redis Client Reconnecting... Attempt ${this.reconnectAttempts}`);
    });
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  public async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
      } catch (error) {
        logger.error('Failed to connect to Redis:', error);
        throw error;
      }
    }
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  public isReady(): boolean {
    return this.isConnected;
  }

  public getClient() {
    if (!this.isConnected) {
      throw new Error('Redis client is not connected');
    }
    return this.client;
  }

  // Méthodes utilitaires avec gestion d'erreur
  public async get(key: string): Promise<string | null> {
    try {
      if (!this.isConnected) await this.connect();
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  public async set(key: string, value: string, options?: { EX?: number; NX?: boolean }): Promise<boolean> {
    try {
      if (!this.isConnected) await this.connect();
      await this.client.set(key, value, options);
      return true;
    } catch (error) {
      logger.error(`Error setting key ${key}:`, error);
      return false;
    }
  }

  public async del(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) await this.connect();
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Error deleting key ${key}:`, error);
      return false;
    }
  }
}

export const redisService = RedisService.getInstance();
export default redisService;