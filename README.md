# Easy Message Queue

A simple message broker designed for small projects and quick experiments.  
Easy Message Queue lets you quickly test ideas involving asynchronous tasks without the overhead of a full-fledged messaging system.

## Project Overview

- **Server:** Written in Go (Golang)
- **Client Libraries:** Will be provided for both Node.js and Go

This setup allows you to easily integrate asynchronous messaging into your applications, whether you are working in JavaScript/Node.js or Go.

## Features

- Lightweight and easy to set up
- Handles asynchronous tasks
- Perfect for prototyping or small-scale applications
- Cross-language client support (Node.js & Go)

## Use Cases

- Testing asynchronous workflows
- Simple task queues for small projects
- Experimenting with event-driven ideas

## Sample code (proposal)

```typescript
import { EasyMqModule } from "@easy-mq/nestjs";
import { Module } from "@nestjs/common";
import { AppService } from "./app.service";

@Module({
  imports: [
    EasyMqModule.forRoot({
      port: 8080,
    }),
  ],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
```

```typescript
import { EasyMqService } from "@easy-mq/nestjs";
import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  constructor(private readonly easyMqService: EasyMqService) {
    this.sendTestMessage();
    setInterval(() => this.sendTestMessage(), 5000);

    this.handleTestMessage();
  }

  sendTestMessage() {
    this.easyMqService.publishJson("test-topic", {
      message: "Hello, Easy MQ!22 : " + new Date().toISOString(),
    });
  }

  handleTestMessage() {
    this.easyMqService.subscribe("test-topic", (message) => {
      console.log("Received message on test-topic:", message);
    });
  }
}
```
