package easy

import (
	"fmt"
	"log"
	"net"

	"github.com/dgraph-io/badger/v4"
	"github.com/mateusgcoelho/easy-message-queue/server/easyproto"
)

type easyServer struct {
	db *badger.DB
}

func NewServer() *easyServer {
	return &easyServer{}
}

func (s *easyServer) Start(addr string) error {
	if err := s.startDatabase(); err != nil {
		return err
	}
	defer s.db.Close()

	if err := s.startListener(addr); err != nil {
		return err
	}

	return nil
}

func (s *easyServer) startDatabase() error {
	log.Println("starting database...")

	db, err := badger.Open(badger.DefaultOptions("/tmp/badger"))
	if err != nil {
		return err
	}
	s.db = db

	return nil
}

func (s *easyServer) startListener(addr string) error {
	log.Printf("starting server on: %s", addr)
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		return err
	}
	defer listener.Close()

	for {
		conn, err := listener.Accept()
		if err != nil {
			log.Printf("failed to accept connection: %v", err)
			continue
		}

		go s.handleConnection(conn)
	}
}

func (s *easyServer) handleConnection(conn net.Conn) {
	log.Printf("accepted connection from: %s", conn.RemoteAddr().String())
	for {
		packet, err := easyproto.ReadPacket(conn)
		if err != nil {
			log.Printf("failed to read packet: %v", err)
			return
		}

		log.Printf("received packet: %+v", packet)
		if packet.Type == easyproto.PacketType_Publish {
			topic := string(packet.Headers["topic"])

			if err := s.handlePublish(packet.ID, topic, packet.Payload); err != nil {
				log.Printf("failed to handle publish: %v", err)
			}
			continue
		}
	}
}

func (s *easyServer) handlePublish(packetId, topic string, payload []byte) error {
	key := fmt.Sprintf("%s|%s", topic, packetId)
	return s.db.Update(func(txn *badger.Txn) error {
		return txn.Set([]byte(key), payload)
	})
}
