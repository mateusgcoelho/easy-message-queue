import { EasyMqService } from '@easy-mq/nestjs';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  constructor(private readonly easyMqService: EasyMqService) {
    setInterval(() => this.sendTestMessage(), 5000);
  }

  sendTestMessage() {
    this.easyMqService.publishJson('test-topic', {
      message: 'Hello, Easy MQ! : ' + new Date().toISOString(),
    });
  }
}
