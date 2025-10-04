import * as net from "net";

const client = net.createConnection({ port: 8080 }, () => {
  console.log("connected to server!");
});

client.on("data", (data) => {
  console.log(data.toString());
  client.end();
});
