import { EasyMqService } from '@easy-mq/nestjs';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  constructor(private readonly easyMqService: EasyMqService) {
    this.sendTestMessage();
    setInterval(() => this.sendTestMessage(), 5000);

    this.handleTestMessage();
  }

  sendTestMessage() {
    this.easyMqService.publishJson('test-topic', {
      message: 'Hello, Easy MQ!22 : ' + new Date().toISOString(),
    });
  }

  handleTestMessage() {
    this.easyMqService.subscribe('test-topic', (message) => {
      console.log('Received message on test-topic:', message);
    });
  }
}
