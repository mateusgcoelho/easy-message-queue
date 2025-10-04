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

	connTopics    map[net.Conn]map[string]struct{}
	topicChannels map[string]chan []byte
}

func NewServer() *easyServer {
	return &easyServer{
		connTopics:    make(map[net.Conn]map[string]struct{}),
		topicChannels: make(map[string]chan []byte),
	}
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
			log.Printf("failed to accept connection.")
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
			log.Println("failed to read packet")
			return
		}

		log.Printf("received packet: %+v", packet.ID)
		if packet.Type == easyproto.PacketType_Publish {
			topic := string(packet.Headers["topic"])

			if err := s.handlePublish(packet.ID, topic, packet.Payload); err != nil {
				log.Printf("failed to handle publish: %v", err)
			}
			continue
		}

		if packet.Type == easyproto.PacketType_Subscribe {
			topic := string(packet.Headers["topic"])

			if err := s.handleSubscribe(conn, topic); err != nil {
				log.Printf("failed to handle subscribe: %v", err)
			}
			continue
		}
	}
}

func (s *easyServer) handlePublish(packetId, topic string, payload []byte) error {
	key := fmt.Sprintf("%s|%s", topic, packetId)
	err := s.db.Update(func(txn *badger.Txn) error {
		return txn.Set([]byte(key), payload)
	})
	if err != nil {
		return err
	}

	if ch, ok := s.topicChannels[topic]; ok {
		ch <- payload
	}

	return nil
}

func (s *easyServer) handleSubscribe(conn net.Conn, topic string) error {
	if _, ok := s.connTopics[conn]; !ok {
		s.connTopics[conn] = make(map[string]struct{})
	}
	s.connTopics[conn][topic] = struct{}{}

	if _, ok := s.topicChannels[topic]; !ok {
		s.topicChannels[topic] = make(chan []byte, 100)
		go s.startTopicWorker(topic, s.topicChannels[topic])
	}

	return nil
}

func (s *easyServer) startTopicWorker(topic string, ch chan []byte) {
	log.Printf("started topic worker for topic: %s", topic)

	for msg := range ch {
		for conn := range s.connTopics {
			if _, ok := s.connTopics[conn][topic]; !ok {
				continue
			}

			log.Printf("sending message to %s on topic %s", conn.RemoteAddr().String(), topic)
			packet := easyproto.NewPublishPacket(topic, msg)
			if err := packet.Write(conn); err != nil {
				log.Printf("failed to send message to %s: %v", conn.RemoteAddr().String(), err)
			}
		}
	}
}
