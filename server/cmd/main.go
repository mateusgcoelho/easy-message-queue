package main

import "github.com/mateusgcoelho/easy-message-queue/server/easy"

func main() {
	easyServer := easy.NewServer()
	if err := easyServer.Start(":8080"); err != nil {
		panic(err)
	}
}
