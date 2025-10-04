package easy

import (
	"log"
	"net"
)

type easyServer struct {
}

func NewServer() *easyServer {
	return &easyServer{}
}

func (s *easyServer) Start(addr string) error {
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

		log.Printf("accepted connection from: %s", conn.RemoteAddr().String())
	}
}
