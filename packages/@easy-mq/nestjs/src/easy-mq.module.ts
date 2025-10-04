import {
  DynamicModule,
  Global,
  InjectionToken,
  Module,
  OptionalFactoryDependency,
  Provider,
} from '@nestjs/common';
import { EASY_MQ_OPTIONS } from './easy-mq.constants';
import { EasyMqService } from './easy-mq.service';
import { EasyMqClient, EasyMqClientProps } from './lib/index';

export interface EasyMqModuleAsyncOptions {
  useFactory?: (
    ...args: any[]
  ) => Promise<EasyMqClientProps> | EasyMqClientProps;
  inject?: (InjectionToken | OptionalFactoryDependency)[];
}

@Global()
@Module({})
export class EasyMqModule {
  static forRoot(options: EasyMqClientProps): DynamicModule {
    const optionsProvider: Provider = {
      provide: EASY_MQ_OPTIONS,
      useValue: options,
    };

    const clientProvider: Provider = {
      provide: EasyMqClient,
      useFactory: (opts: EasyMqClientProps) => new EasyMqClient(opts),
      inject: [EASY_MQ_OPTIONS],
    };

    return {
      module: EasyMqModule,
      providers: [optionsProvider, clientProvider],
      exports: [clientProvider],
    };
  }

  static forRootAsync(options: EasyMqModuleAsyncOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: EASY_MQ_OPTIONS,
      useFactory: options.useFactory!,
      inject: options.inject,
    };

    const clientProvider: Provider = {
      provide: EasyMqClient,
      useFactory: (opts: EasyMqClientProps) => new EasyMqClient(opts),
      inject: [EASY_MQ_OPTIONS],
    };

    const serviceProvider: Provider = {
      provide: EasyMqService,
      useFactory: (client: EasyMqClient) => new EasyMqService(client),
      inject: [EasyMqClient],
    };

    return {
      module: EasyMqModule,
      providers: [optionsProvider, clientProvider, serviceProvider],
      exports: [clientProvider, serviceProvider],
    };
  }
}
