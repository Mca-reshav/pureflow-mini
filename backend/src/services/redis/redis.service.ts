import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

@Injectable()
export class RedisService {
  constructor(@InjectRedis() private redis: Redis) {}
  async get(key: string) {
    try {
      const response = await this.redis.get(key);
      return response;
    } catch (error) {
      console.log('Redis get error', error);
      return false;
    }
  }

  async set(key: string, data: any) {
    try {
      const ttl = 7 * 24 * 60 * 60;
      const response = await this.redis.set(key, data, 'EX', ttl);
      return response;
    } catch (error) {
      console.log('Redis set error', error);
      return false;
    }
  }

  async del(key: string) {
    try {
      const response = await this.redis.del(key);
      return response;
    } catch (error) {
      console.log('Redis del error', error);
      return false;
    }
  }
}
