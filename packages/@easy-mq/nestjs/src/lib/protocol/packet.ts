import { ulid } from 'ulid';

export enum PacketType {
  PUBLISH = 1,
}

export class Packet {
  #id: string;
  #type: PacketType;
  #headers: Record<string, string> = {};
  #payloadSize: number;
  #payload: Buffer;

  constructor(type: PacketType, payload: Buffer) {
    this.#id = ulid();
    this.#type = type;
    this.#payload = payload;
    this.#payloadSize = payload.length;
  }

  static from(type: PacketType, payload: Buffer): Packet {
    return new Packet(type, payload);
  }

  addHeader(key: string, value: string): void {
    this.#headers[key] = value;
  }

  serialize(): Buffer {
    const parts: Buffer[] = [];

    // Serialize ID
    const idBuffer = Buffer.from(this.#id, 'utf-8');
    const idLengthBuffer = Buffer.alloc(1);
    idLengthBuffer.writeUInt8(idBuffer.length, 0);
    parts.push(idLengthBuffer, idBuffer);

    // Serialize Type
    const typeBuffer = Buffer.alloc(1);
    typeBuffer.writeUInt8(this.#type, 0);
    parts.push(typeBuffer);

    // Serialize headers
    const headerKeys = Object.keys(this.#headers);
    const headerCountBuffer = Buffer.alloc(1);
    headerCountBuffer.writeUInt8(headerKeys.length, 0);
    parts.push(headerCountBuffer);

    for (const key of headerKeys) {
      const value = this.#headers[key];
      const keyBuffer = Buffer.from(key, 'utf-8');
      const valueBuffer = Buffer.from(value, 'utf-8');

      const keyLengthBuffer = Buffer.alloc(1);
      keyLengthBuffer.writeUInt8(keyBuffer.length, 0);
      const valueLengthBuffer = Buffer.alloc(2);
      valueLengthBuffer.writeUInt16BE(valueBuffer.length, 0);

      parts.push(keyLengthBuffer, keyBuffer, valueLengthBuffer, valueBuffer);
    }

    // Serialize payload
    const payloadSizeBuffer = Buffer.alloc(4);
    payloadSizeBuffer.writeUInt32BE(this.#payloadSize, 0);
    parts.push(payloadSizeBuffer);

    parts.push(this.#payload);

    return Buffer.concat(parts);
  }

  toString(): string {
    return `Packet(id=${this.#id}, type=${this.#type}, headers=${JSON.stringify(this.#headers)}, payload=${this.#payload.toString()})`;
  }
}
