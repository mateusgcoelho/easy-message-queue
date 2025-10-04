import * as net from 'net';
import { Packet, PacketType } from './protocol/packet';

export type EasyMqClientProps = {
  port: number;
  onConnect?: () => void;
};

export class EasyMqClient {
  #client: net.Socket;

  constructor(props: EasyMqClientProps) {
    this.connect(props);
  }

  connect(props: EasyMqClientProps) {
    console.log('connecting to server...');
    this.#client = net.createConnection({ port: props.port }, props.onConnect);

    this.#client.on('data', (data) => {
      console.log(data.toString());
    });

    this.#client.on('end', () => {
      console.log('disconnected from server');
      setTimeout(() => this.connect(props), 1000);
    });

    this.#client.on('error', (err) => {
      console.log('error: ', err);
      setTimeout(() => this.connect(props), 1000);
    });
  }

  publishJson(topic: string, data: any) {
    const buf = Buffer.from(JSON.stringify(data));

    const packet = Packet.from(PacketType.PUBLISH, buf);
    packet.addHeader('topic', topic);
    packet.addHeader('content-type', 'application/json');

    this.#client.write(packet.serialize());
  }
}
