import Redis from 'ioredis';
import { QueuedOperation } from '../types/queue';

export class RedisService {
  private client: Redis;
  private static instance: RedisService;
  
  private constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: null,
    });
  }

  static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  async addToQueue(operation: QueuedOperation): Promise<void> {
    await this.client.lpush('graph_operations_queue', JSON.stringify(operation));
  }

  async getFromQueue(): Promise<QueuedOperation | null> {
    const data = await this.client.rpop('graph_operations_queue');
    return data ? JSON.parse(data) : null;
  }

  async setOperationStatus(operationId: string, status: QueuedOperation['status'], result?: any): Promise<void> {
    await this.client.hset(
      `operation:${operationId}`,
      'status', status,
      'result', JSON.stringify(result || {})
    );
    await this.client.expire(`operation:${operationId}`, 3600); // Expire après 1 heure
  }

  async getOperationStatus(operationId: string): Promise<{ status: string; result: any } | null> {
    const data = await this.client.hgetall(`operation:${operationId}`);
    return data ? {
      status: data.status,
      result: JSON.parse(data.result || '{}')
    } : null;
  }

  async checkDuplicate(requestHash: string): Promise<string | null> {
    return this.client.get(`request:${requestHash}`);
  }

  async setDuplicate(requestHash: string, operationId: string): Promise<void> {
    await this.client.set(`request:${requestHash}`, operationId, 'EX', 3600);
  }
}

// 3. Contrôleur mis à jour (controllers/graphController.ts)
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { RedisService } from '../services/redis';
import Project from '../models/Project';
import NodeModel from '../models/Node';
import Edge from '../models/Edge';
import path from 'path';
import fs from 'fs/promises';
import { QueuedOperation } from '../types/queue';

const redisService = RedisService.getInstance();

function generateRequestHash(data: any): string {
  return createHash('md5').update(JSON.stringify(data)).digest('hex');
}

export const updateGraph = async (req: Request, res: Response) => {
  const { project, nodes, edges } = req.body;

  if (!project || !nodes || !edges) {
    return res.status(400).json({ message: 'Project, nodes, and edges are required.' });
  }

  try {
    // Générer un hash pour détecter les doublons
    const requestHash = generateRequestHash({ project, nodes, edges });
    
    // Vérifier les doublons
    const existingOperationId = await redisService.checkDuplicate(requestHash);
    if (existingOperationId) {
      return res.json({ 
        message: 'Operation already in progress',
        operationId: existingOperationId
      });
    }

    const operationId = uuidv4();
    const operation: QueuedOperation = {
      id: operationId,
      type: 'updateGraph',
      data: { project, nodes, edges },
      timestamp: Date.now(),
      requestHash,
      status: 'pending'
    };

    await redisService.addToQueue(operation);
    await redisService.setDuplicate(requestHash, operationId);
    await redisService.setOperationStatus(operationId, 'pending');

    res.json({ 
      message: 'Update queued successfully',
      operationId
    });
  } catch (error) {
    console.error('Error queueing graph update:', error);
    res.status(500).json({ message: 'Error queueing update', error: error.message });
  }
};

export const checkOperationStatus = async (req: Request, res: Response) => {
  const { operationId } = req.params;

  try {
    const status = await redisService.getOperationStatus(operationId);
    if (!status) {
      return res.status(404).json({ message: 'Operation not found' });
    }
    res.json(status);
  } catch (error) {
    console.error('Error checking operation status:', error);
    res.status(500).json({ message: 'Error checking status' });
  }
};
