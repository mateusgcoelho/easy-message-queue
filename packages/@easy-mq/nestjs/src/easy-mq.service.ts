import { Injectable } from '@nestjs/common';
import { EasyMqClient } from './lib';

@Injectable()
export class EasyMqService {
  constructor(private readonly client: EasyMqClient) {}

  publishJson(topic: string, data: any) {
    this.client.publishJson(topic, data);
  }
}
