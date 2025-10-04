package easy

import "log"

type easyServer struct {
}

func NewServer() *easyServer {
	return &easyServer{}
}

func (s *easyServer) Start(addr string) error {
	log.Println("Server started at", addr)
	return nil
}
