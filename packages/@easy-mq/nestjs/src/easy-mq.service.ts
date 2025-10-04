import { Injectable } from '@nestjs/common';
import { EasyMqClient } from './lib';

@Injectable()
export class EasyMqService {
  constructor(private readonly client: EasyMqClient) {}

  publishJson(topic: string, data: any) {
    this.client.publishJson(topic, data);
  }

  subscribe(topic: string, handler: (payload: any) => void) {
    this.client.subscribe(topic, handler);
  }
}
