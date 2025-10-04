package main

import (
	"fmt"

	"github.com/dgraph-io/badger/v4"
)

func main() {
	opts := badger.DefaultOptions("/tmp/badger")
	opts.Logger = nil
	db, err := badger.Open(opts)
	if err != nil {
		panic(err)
	}
	defer db.Close()

	messages, err := readMessages(db, "test-topic")
	if err != nil {
		panic(err)
	}

	fmt.Println("Messages:", string(messages))
}

func readMessages(db *badger.DB, topic string) ([]byte, error) {
	msg := []byte{}
	prefix := []byte(topic + "|")

	err := db.Update(func(txn *badger.Txn) error {
		opts := badger.DefaultIteratorOptions
		opts.Reverse = true
		it := txn.NewIterator(opts)
		defer it.Close()

		seekKey := append(prefix, 0xFF)
		it.Seek(seekKey)

		if it.ValidForPrefix(prefix) {
			item := it.Item()
			val, err := item.ValueCopy(nil)
			if err != nil {
				return err
			}
			msg = val
			return txn.Delete(item.Key())
		}

		return fmt.Errorf("nenhuma mensagem encontrada")
	})

	return msg, err
}
