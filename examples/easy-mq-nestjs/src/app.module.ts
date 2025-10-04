import { EasyMqModule, EasyMqService } from '@easy-mq/nestjs';
import { Module } from '@nestjs/common';
import { AppService } from './app.service';

@Module({
  imports: [
    EasyMqModule.forRoot({
      port: 8080,
      onConnect: () => console.log('connected to EasyMQ server'),
    }),
  ],
  controllers: [],
  providers: [EasyMqService, AppService],
})
export class AppModule {}
