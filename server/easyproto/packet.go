package easyproto

import (
	"encoding/binary"
	"fmt"
	"io"

	"github.com/oklog/ulid/v2"
)

type PacketType uint8

const (
	PacketType_Publish PacketType = iota + 1
	PacketType_Subscribe
)

type packet struct {
	ID      string
	Headers map[string]string
	Type    PacketType
	Payload []byte
}

func NewPacket(pktType PacketType, payload []byte) *packet {
	id := ulid.Make().String()
	headers := make(map[string]string)

	return &packet{
		ID:      id,
		Type:    pktType,
		Headers: headers,
		Payload: payload,
	}
}

func NewPublishPacket(topic string, payload []byte) *packet {
	p := NewPacket(PacketType_Publish, payload)
	p.SetHeader("topic", topic)
	return p
}

func ReadPacket(r io.Reader) (*packet, error) {
	p := &packet{
		Headers: make(map[string]string),
	}

	// 1. Ler tamanho total do pacote
	sizeBuf := make([]byte, 4)
	if _, err := io.ReadFull(r, sizeBuf); err != nil {
		return nil, fmt.Errorf("reading total size: %w", err)
	}
	packetSize := binary.BigEndian.Uint32(sizeBuf)

	// 2. Ler o corpo do pacote
	body := make([]byte, packetSize-4)
	if _, err := io.ReadFull(r, body); err != nil {
		return nil, fmt.Errorf("reading body: %w", err)
	}

	offset := 0

	// 3. Ler tamanho do ID (1 byte)
	if offset >= len(body) {
		return nil, fmt.Errorf("body too short for ID length")
	}
	idLen := int(body[offset])
	offset++

	// 4. Ler o ID
	if offset+idLen > len(body) {
		return nil, fmt.Errorf("body too short for ID")
	}
	p.ID = string(body[offset : offset+idLen])
	offset += idLen

	// 5. Ler Type (1 byte)
	if offset >= len(body) {
		return nil, fmt.Errorf("body too short for Type")
	}
	p.Type = PacketType(body[offset])
	offset++

	// 6. Ler quantidade de headers (1 byte)
	if offset >= len(body) {
		return nil, fmt.Errorf("body too short for header count")
	}
	headerCount := int(body[offset])
	offset++

	// 7. Ler headers
	for i := 0; i < headerCount; i++ {
		// chave
		if offset >= len(body) {
			return nil, fmt.Errorf("body too short for header key length")
		}
		keyLen := int(body[offset])
		offset++
		if offset+keyLen > len(body) {
			return nil, fmt.Errorf("body too short for header key")
		}
		key := string(body[offset : offset+keyLen])
		offset += keyLen

		// valor
		if offset >= len(body) {
			return nil, fmt.Errorf("body too short for header value length")
		}
		valLen := int(body[offset])
		offset++
		if offset+valLen > len(body) {
			return nil, fmt.Errorf("body too short for header value")
		}
		value := string(body[offset : offset+valLen])
		offset += valLen

		p.Headers[key] = value
	}

	// 8. O restante é payload
	if offset > len(body) {
		return nil, fmt.Errorf("offset exceeds body length")
	}
	p.Payload = body[offset:]

	return p, nil
}

func (p *packet) SetHeader(key, value string) {
	p.Headers[key] = value
}

func (p *packet) Write(w io.Writer) error {
	parts := [][]byte{}

	// 1. ID
	idBuf := []byte(p.ID)
	if len(idBuf) > 255 {
		return fmt.Errorf("ID too long")
	}

	idLenBuf := []byte{byte(len(idBuf))}
	parts = append(parts, idLenBuf, idBuf)

	// 2. Type
	typeBuf := []byte{byte(p.Type)}
	parts = append(parts, typeBuf)

	// 3. Headers
	if len(p.Headers) > 255 {
		return fmt.Errorf("too many headers")
	}
	headerCountBuf := []byte{byte(len(p.Headers))}
	parts = append(parts, headerCountBuf)

	for k, v := range p.Headers {
		keyBuf := []byte(k)
		if len(keyBuf) > 255 {
			return fmt.Errorf("header key too long")
		}
		keyLenBuf := []byte{byte(len(keyBuf))}

		valBuf := []byte(v)
		if len(valBuf) > 255 {
			return fmt.Errorf("header value too long")
		}
		valLenBuf := []byte{byte(len(valBuf))}

		parts = append(parts, keyLenBuf, keyBuf, valLenBuf, valBuf)
	}

	// 4. Payload
	parts = append(parts, p.Payload)

	// 5. Tamanho total
	body := []byte{}
	for _, part := range parts {
		body = append(body, part...)
	}
	totalSize := uint32(len(body) + 4) // +4 para incluir o tamanho em si
	sizeBuf := make([]byte, 4)
	binary.BigEndian.PutUint32(sizeBuf, totalSize)

	parts = append([][]byte{sizeBuf}, parts...)

	finalBuf := []byte{}
	for _, part := range parts {
		finalBuf = append(finalBuf, part...)
	}

	_, err := w.Write(finalBuf)
	if err != nil {
		return fmt.Errorf("writing packet: %w", err)
	}

	return nil
}
