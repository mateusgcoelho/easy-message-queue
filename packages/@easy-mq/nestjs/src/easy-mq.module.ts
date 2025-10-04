import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { EASY_MQ_OPTIONS } from './easy-mq.constants';
import { EasyMqService } from './easy-mq.service';
import { EasyMqClient, EasyMqClientProps } from './lib/index';

@Global()
@Module({})
export class EasyMqModule {
  static forRoot(options: EasyMqClientProps): DynamicModule {
    return {
      module: EasyMqModule,
      providers: [...EasyMqModule.getProviders(options)],
      exports: [EasyMqService],
    };
  }

  private static getProviders(options: EasyMqClientProps): Provider[] {
    const clientProvider: Provider = {
      provide: EasyMqClient,
      useFactory: (opts: EasyMqClientProps) => new EasyMqClient(opts),
      inject: [EASY_MQ_OPTIONS],
    };

    return [
      {
        provide: EASY_MQ_OPTIONS,
        useValue: options,
      },
      clientProvider,
      ModulesContainer,
      EasyMqService,
    ];
  }
}
