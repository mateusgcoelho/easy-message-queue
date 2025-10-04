import { Logger } from '@nestjs/common';
import * as net from 'net';
import { Packet, PacketType } from './protocol/packet';

export type EasyMqClientProps = {
  port: number;
  onConnect?: () => void;
};

export class EasyMqClient {
  static handlers: { [topic: string]: (payload: any) => void } = {};
  #logger = new Logger(EasyMqClient.name);
  #client: net.Socket;

  constructor(props: EasyMqClientProps) {
    this.connect(props);
  }

  connect(props: EasyMqClientProps) {
    this.#logger.log('connecting to server...');
    this.#client = net.createConnection({ port: props.port }, () => {
      this.#logger.log('connected to server');
    });

    this.#client.on('error', (err) => {
      this.#logger.error('error: ', err);
      setTimeout(() => this.connect(props), 1000);
    });

    this.#client.on('connect', () => {
      if (EasyMqClient.handlers) {
        Object.keys(EasyMqClient.handlers).forEach((topic) => {
          this.subscribe(topic, EasyMqClient.handlers[topic]);
        });
      }

      this.#client.on('data', (data) => {
        const packet = Packet.parse(data);
        this.#logger.debug(
          `received packet: id=${packet.id}, type=${PacketType[packet.type]}`,
        );

        if (packet.type === PacketType.PUBLISH) {
          const topic = packet.headers['topic'];
          if (!topic) {
            this.#logger.warn('Received PUBLISH packet without topic header');
            return;
          }

          const handlerTopic = EasyMqClient.handlers[topic];
          if (handlerTopic) {
            handlerTopic(packet.payloadJson());
          }
        }
      });

      this.#client.on('end', () => {
        this.#logger.log('disconnected from server');
        setTimeout(() => this.connect(props), 1000);
      });
    });
  }

  publishJson(topic: string, data: any) {
    const buf = Buffer.from(JSON.stringify(data));

    const packet = Packet.create(PacketType.PUBLISH, buf);
    packet.addHeader('topic', topic);
    packet.addHeader('content-type', 'application/json');

    this.#client.write(packet.serialize());
  }

  subscribe(topic: string, handler: (payload: any) => void) {
    const packet = Packet.create(PacketType.SUBSCRIBE, Buffer.alloc(0));
    packet.addHeader('topic', topic);

    this.#client.write(packet.serialize());

    EasyMqClient.handlers[topic] = handler;
  }
}
