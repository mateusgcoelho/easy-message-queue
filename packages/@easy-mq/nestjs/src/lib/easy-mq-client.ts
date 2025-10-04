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
  #props: EasyMqClientProps;

  constructor(props: EasyMqClientProps) {
    this.#props = props;
    this.connect();
  }

  connect() {
    this.#logger.log('connecting to server...');
    this.#client = net.createConnection({ port: this.#props.port }, () => {
      this.#logger.log('connected to server');
    });

    this.#client.on('error', () => this.handleOnCloseConnection());

    this.#client.on('connect', () => this.handleOnConnect());
  }

  private handleOnCloseConnection() {
    this.#logger.log('connection closed, reconnecting...');
    setTimeout(() => this.connect(), 1000);
  }

  private handleOnConnect() {
    if (EasyMqClient.handlers) {
      Object.keys(EasyMqClient.handlers).forEach((topic) => {
        this.subscribe(topic, EasyMqClient.handlers[topic]);
      });
    }

    this.#client.on('data', (data) => this.handleData(data));
    this.#client.on('end', () => this.handleOnCloseConnection());
  }

  private handleData(data: Buffer) {
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
      if (!handlerTopic) {
        this.#logger.warn(`No handler for topic: ${topic}`);
        return;
      }

      handlerTopic(packet.payloadJson());
    }
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
