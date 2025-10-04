/* eslint-disable @typescript-eslint/no-unsafe-return */
import { ulid } from 'ulid';

export enum PacketType {
  PUBLISH = 1,
  SUBSCRIBE = 2,
}

export class Packet {
  #id: string;
  #type: PacketType;
  #headers: Record<string, string> = {};
  #payload: Buffer;

  constructor(
    id: string,
    type: PacketType,
    headers: Record<string, string>,
    payload: Buffer,
  ) {
    this.#id = id;
    this.#type = type;
    this.#headers = headers;
    this.#payload = payload;
  }

  static create(type: PacketType, payload: Buffer): Packet {
    return new Packet(ulid(), type, {}, payload);
  }

  static from(
    id: string,
    headers: Record<string, string>,
    type: PacketType,
    payload: Buffer,
  ): Packet {
    return new Packet(id, type, headers, payload);
  }

  addHeader(key: string, value: string): void {
    this.#headers[key] = value;
  }

  get id(): string {
    return this.#id;
  }

  get type(): PacketType {
    return this.#type;
  }

  get headers(): Record<string, string> {
    return this.#headers;
  }

  payloadJson() {
    return JSON.parse(this.#payload.toString('utf-8'));
  }

  serialize(): Buffer {
    const parts: Buffer[] = [];

    const idBuffer = Buffer.from(this.#id, 'utf-8');
    const idLengthBuffer = Buffer.alloc(1);
    idLengthBuffer.writeUInt8(idBuffer.length, 0);
    parts.push(idLengthBuffer, idBuffer);

    const typeBuffer = Buffer.alloc(1);
    typeBuffer.writeUInt8(this.#type, 0);
    parts.push(typeBuffer);

    const headerKeys = Object.keys(this.#headers);
    const headerCountBuffer = Buffer.alloc(1);
    headerCountBuffer.writeUInt8(headerKeys.length, 0);
    parts.push(headerCountBuffer);

    for (const key of headerKeys) {
      const keyBuffer = Buffer.from(key, 'utf-8');
      const valueBuffer = Buffer.from(this.#headers[key], 'utf-8');

      const keyLengthBuffer = Buffer.alloc(1);
      keyLengthBuffer.writeUInt8(keyBuffer.length, 0);

      const valueLengthBuffer = Buffer.alloc(1);
      valueLengthBuffer.writeUInt8(valueBuffer.length, 0);

      parts.push(keyLengthBuffer, keyBuffer, valueLengthBuffer, valueBuffer);
    }

    parts.push(this.#payload);

    const bodyBuffer = Buffer.concat(parts);
    const totalSizeBuffer = Buffer.alloc(4);
    totalSizeBuffer.writeUInt32BE(bodyBuffer.length + 4, 0); // +4 para incluir o tamanho em si

    return Buffer.concat([totalSizeBuffer, bodyBuffer]);
  }

  static parse(buffer: Buffer): Packet {
    let offset = 0;

    if (buffer.length < 4) {
      throw new Error('Buffer too short to contain total size');
    }

    // 1. Ler tamanho total (4 bytes)
    const totalSize = buffer.readUInt32BE(offset);
    offset += 4;

    if (buffer.length < totalSize) {
      throw new Error(`Buffer too short, expected ${totalSize} bytes`);
    }

    // 2. Ler tamanho do ID (1 byte)
    const idLen = buffer.readUInt8(offset);
    offset += 1;

    // 3. Ler ID
    const id = buffer.toString('utf-8', offset, offset + idLen);
    offset += idLen;

    // 4. Ler Type (1 byte)
    const type = buffer.readUInt8(offset) as PacketType;
    offset += 1;

    // 5. Ler quantidade de headers (1 byte)
    const headerCount = buffer.readUInt8(offset);
    offset += 1;

    // 6. Ler headers
    const headers: Record<string, string> = {};
    for (let i = 0; i < headerCount; i++) {
      const keyLen = buffer.readUInt8(offset);
      offset += 1;
      const key = buffer.toString('utf-8', offset, offset + keyLen);
      offset += keyLen;

      const valLen = buffer.readUInt8(offset);
      offset += 1;
      const value = buffer.toString('utf-8', offset, offset + valLen);
      offset += valLen;

      headers[key] = value;
    }

    // 7. Payload (restante)
    const payload = buffer.slice(offset, totalSize);

    return Packet.from(id, headers, type, payload);
  }

  toString(): string {
    return `Packet(id=${this.#id}, type=${this.#type}, headers=${JSON.stringify(this.#headers)}, payload=${this.#payload.toString()})`;
  }
}
