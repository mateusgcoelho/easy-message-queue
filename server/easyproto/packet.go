package easyproto

import (
	"encoding/binary"
	"fmt"
	"io"
)

type PacketType uint8

const (
	PacketType_Publish PacketType = iota + 1
)

type packet struct {
	ID          string
	Headers     map[string]string
	Type        PacketType
	PayloadSize uint32
	Payload     []byte
}

func ReadPacket(r io.Reader) (*packet, error) {
	p := &packet{
		Headers: make(map[string]string),
	}

	// --- Read ID ---
	var idLen uint8
	if err := binary.Read(r, binary.BigEndian, &idLen); err != nil {
		return nil, fmt.Errorf("reading ID length: %w", err)
	}

	idBuf := make([]byte, idLen)
	if _, err := io.ReadFull(r, idBuf); err != nil {
		return nil, fmt.Errorf("reading ID: %w", err)
	}
	p.ID = string(idBuf)

	// --- Read Type ---
	var pktType uint8
	if err := binary.Read(r, binary.BigEndian, &pktType); err != nil {
		return nil, fmt.Errorf("reading packet type: %w", err)
	}
	p.Type = PacketType(pktType)

	// --- Read Headers ---
	var headerCount uint8
	if err := binary.Read(r, binary.BigEndian, &headerCount); err != nil {
		return nil, fmt.Errorf("reading header count: %w", err)
	}

	for i := 0; i < int(headerCount); i++ {
		// Read key
		var keyLen uint8
		if err := binary.Read(r, binary.BigEndian, &keyLen); err != nil {
			return nil, fmt.Errorf("reading header key length: %w", err)
		}

		keyBuf := make([]byte, keyLen)
		if _, err := io.ReadFull(r, keyBuf); err != nil {
			return nil, fmt.Errorf("reading header key: %w", err)
		}
		key := string(keyBuf)

		// Read value
		var valLen uint16
		if err := binary.Read(r, binary.BigEndian, &valLen); err != nil {
			return nil, fmt.Errorf("reading header value length: %w", err)
		}

		valBuf := make([]byte, valLen)
		if _, err := io.ReadFull(r, valBuf); err != nil {
			return nil, fmt.Errorf("reading header value: %w", err)
		}
		val := string(valBuf)

		p.Headers[key] = val
	}

	// --- Read PayloadSize ---

	// --- Read Payload ---
	if err := binary.Read(r, binary.BigEndian, &p.PayloadSize); err != nil {
		return nil, fmt.Errorf("reading payload size: %w", err)
	}

	p.Payload = make([]byte, p.PayloadSize)
	if _, err := io.ReadFull(r, p.Payload); err != nil {
		return nil, fmt.Errorf("reading payload: %w", err)
	}

	return p, nil
}
