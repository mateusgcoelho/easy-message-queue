import { EasyMqModule } from '@easy-mq/nestjs';
import { Module } from '@nestjs/common';
import { AppService } from './app.service';

@Module({
  imports: [
    EasyMqModule.forRoot({
      port: 8080,
    }),
  ],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
