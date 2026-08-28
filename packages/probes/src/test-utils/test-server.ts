import * as http from 'node:http';
import type { AddressInfo } from 'node:net';

export interface TestServer {
  port: number;
  close: () => Promise<void>;
}

export async function startTestServer(
  handler: http.RequestListener,
): Promise<TestServer> {
  const server = http.createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  return {
    port: address.port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
